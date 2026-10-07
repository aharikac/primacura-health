"""PrimaCura backend API (FastAPI).

Endpoints:
  POST /chat/        a typed (or on-device transcribed) message -> protocol or question
  POST /transcribe/  audio from the web app -> Whisper on the server -> same as /chat/
  POST /contact/     contact form -> email to the team

The decision logic lives in pchTriage.py; shared data and helpers in pchCore.py;
the optional LLM second opinion in pchLLM.py.

Run locally:  uvicorn pchService:app --host 127.0.0.1 --port 8000
"""

import re
import shutil
import threading
import os
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from functools import lru_cache
from threading import RLock
from typing import Any
import logging
import pandas as pd
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import whisper
from pydantic import BaseModel, Field
import pchCore
import pchGate
import pchLLM
import pchTriage
from pchCore import CONFIG, Conversation, load_dataset, load_embedding_model
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

try:
    from google.cloud import secretmanager
    import google.auth
    from google.auth.exceptions import DefaultCredentialsError
except ImportError:
    secretmanager = None

# Load local .env file if it exists
load_dotenv()


logger = logging.getLogger("uvicorn.error")
logging.basicConfig(level=logging.INFO)
print("Loading local Whisper model...", flush=True)
GLOBAL_WHISPER_MODEL = whisper.load_model("base")
print("Model loaded successfully!", flush=True)

@dataclass(frozen=True)
class FirstAidRuntime:
    """Objects that are expensive to create and safe to reuse across requests."""

    dataset: pd.DataFrame
    model: Any
    classifier: pchTriage.ConditionClassifier
    age_sensitive: set[str]
    llm: pchLLM.LLMClassifier | None
    gate: pchGate.NonsenseGate | None


@lru_cache(maxsize=1)
def get_runtime() -> FirstAidRuntime:
    """Load the protocols, embedding model, classifier, nonsense gate and LLM client once per process."""

    dataset = load_dataset()
    model = load_embedding_model()
    return FirstAidRuntime(
        dataset=dataset,
        model=model,
        classifier=pchTriage.ConditionClassifier.train(model),
        age_sensitive=pchCore.age_sensitive_conditions(dataset),
        llm=pchLLM.load_llm(),
        gate=pchGate.load_gate(model),
    )


# Dev-only switch (see /dev/llm_enabled) for A/B evaluation without a restart.
_llm_switched_off = False

_conversations: dict[str, Conversation] = {}
_conversation_lock = RLock()


def _conversation_for(session_id: str) -> Conversation:
    key = (session_id or "default").strip()[:128] or "default"
    with _conversation_lock:
        return _conversations.setdefault(key, Conversation())


SMTP_PASSWORD_CACHE = None

def fetch_smtp_password():
    # 1. Try local environment variable first
    pwd = os.getenv("SMTP_APP_PASSWORD")
    if pwd:
        logger.info("Loaded SMTP password from environment variable.")
        return pwd
        
    # 2. Fall back to Google Secret Manager if running in GCP
    if secretmanager is None:
        logger.warning("google-cloud-secret-manager not installed. Cannot fetch from GCP.")
        return None
        
    try:
        _, project_id = google.auth.default()
        if not project_id:
            logger.warning("Could not determine GCP project ID.")
            return None
            
        client = secretmanager.SecretManagerServiceClient()
        secret_name = f"projects/{project_id}/secrets/SMTP_APP_PASSWORD/versions/latest"
        response = client.access_secret_version(request={"name": secret_name})
        pwd = response.payload.data.decode("UTF-8")
        logger.info("Loaded SMTP password from Google Secret Manager.")
        return pwd
    except DefaultCredentialsError:
        logger.warning("No Google credentials found. Skipping Secret Manager.")
    except Exception as e:
        logger.error(f"Failed to fetch from Secret Manager: {e}")
        
    return None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global SMTP_PASSWORD_CACHE
    SMTP_PASSWORD_CACHE = fetch_smtp_password()
    
    if not SMTP_PASSWORD_CACHE:
        logger.warning("SMTP_APP_PASSWORD is not set. Contact form submissions will fail.")

    # Load the models and train the classifier before accepting the first
    # query. The LLM warms up in the background: until it is ready, requests
    # simply fall back to the tap-to-pick list.
    runtime = get_runtime()
    if runtime.llm is not None:
        threading.Thread(target=runtime.llm.warm_up, daemon=True).start()
    yield



app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(([a-zA-Z0-9-]+\.)*primacura\.health|(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    session_id: str = "default"

class ContactForm(BaseModel):
    name: str
    email: str
    message: str = Field(..., max_length=1000)

    
@app.post("/chat/")
def chat_endpoint(req: ChatRequest):
    result = processUserQuery(req.query, session_id=req.session_id)
    return result

# ---------------------------------------------------------------------------
# Development-only endpoints. Never enabled unless PRIMACURA_DEV_ENDPOINTS=1.
# ---------------------------------------------------------------------------
class EmbedCsvRequest(BaseModel):
    path: str      # CSV path relative to primacura-backend/
    column: str    # text column to embed
    out: str       # .npy output path relative to primacura-backend/


if os.getenv("PRIMACURA_DEV_ENDPOINTS") == "1":

    @app.post("/dev/embed_csv")
    def dev_embed_csv(req: EmbedCsvRequest):
        """Embed one CSV column with the production model and save it as .npy.

        Used to tune the condition classifier offline with exactly the vectors
        the server produces. Paths are confined to the backend folder.
        """
        import numpy as np

        base = pchCore.REPO_ROOT.resolve()
        src = (base / req.path).resolve()
        dst = (base / req.out).resolve()
        if base not in src.parents or base not in dst.parents or dst.suffix != ".npy":
            raise HTTPException(status_code=400, detail="paths must stay inside the backend folder; out must be .npy")
        texts = pd.read_csv(src)[req.column].astype(str).tolist()
        vectors = get_runtime().model.encode(texts, batch_size=64, show_progress_bar=False, convert_to_numpy=True)
        dst.parent.mkdir(parents=True, exist_ok=True)
        np.save(dst, np.asarray(vectors, dtype="float32"))
        return {"rows": len(texts), "dim": int(vectors.shape[1]), "out": str(dst.relative_to(base))}

    @app.get("/dev/master_test_set")
    def dev_master_test_set():
        """The master test set as JSON, so a browser-based evaluation can load it."""
        import csv
        path = pchCore.REPO_ROOT / "tests" / "eval" / "master-test-set.csv"
        with path.open(encoding="utf-8") as fh:
            return list(csv.DictReader(fh))

    class GateScoresRequest(BaseModel):
        texts: list[str]
        C: float | None = None  # try another regularisation without a restart

    @app.post("/dev/gate_scores")
    def dev_gate_scores(req: GateScoresRequest):
        """p(junk) and the emergency-word check for each text (to tune the nonsense filter)."""
        gate = get_runtime().gate
        if req.C is not None:
            saved = CONFIG["GATE_C"]
            CONFIG["GATE_C"] = req.C
            try:
                gate = pchGate.NonsenseGate.train(get_runtime().model)
            finally:
                CONFIG["GATE_C"] = saved
        if gate is None:
            raise HTTPException(status_code=503, detail="nonsense gate is off")
        return [{"text": t, "p_junk": round(gate.p_junk(t), 4),
                 "emergency_word": pchGate.mentions_domain(t, gate.words), "kept": gate.keep(t)}
                for t in req.texts]

    @app.post("/dev/llm_enabled")
    def dev_llm_enabled(enabled: bool):
        """Switch the LLM second opinion on or off for /chat/ (A/B evaluation)."""
        global _llm_switched_off
        _llm_switched_off = not enabled
        return {"llm_enabled": enabled}

    class LlmCsvRequest(BaseModel):
        path: str                 # CSV path relative to primacura-backend/
        column: str               # text column to classify
        out: str                  # .csv output path relative to primacura-backend/
        model: str | None = None  # Ollama model tag; default PRIMACURA_LLM_MODEL
        options: dict | None = None  # extra Ollama options, e.g. {"num_gpu": 0, "num_thread": 4}
        limit: int | None = None     # only the first N rows

    @app.post("/dev/llm_csv")
    def dev_llm_csv(req: LlmCsvRequest):
        """Run the LLM classifier over one CSV column (for model benchmarking)."""
        base = pchCore.REPO_ROOT.resolve()
        src = (base / req.path).resolve()
        dst = (base / req.out).resolve()
        if base not in src.parents or base not in dst.parents or dst.suffix != ".csv":
            raise HTTPException(status_code=400, detail="paths must stay inside the backend folder; out must be .csv")
        llm = pchLLM.LLMClassifier(model=req.model, timeout=120, extra_options=req.options)
        llm.classify("warm-up")  # load the model before timing
        rows = []
        texts = pd.read_csv(src)[req.column].astype(str).tolist()[: req.limit or None]
        for text in texts:
            result = llm.classify(text)
            rows.append({"text": text, "label": result.label or "", "latency_ms": result.latency_ms,
                         "error": result.error})
        dst.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(rows).to_csv(dst, index=False)
        latencies = sorted(r["latency_ms"] for r in rows)
        return {"model": llm.model, "rows": len(rows), "errors": sum(1 for r in rows if r["error"]),
                "median_ms": latencies[len(latencies) // 2], "out": str(dst.relative_to(base))}


@app.post("/transcribe/")
async def speak_endpoint(
    audio_file: UploadFile = File(...),
    session_id: str = Form("default", embed=True, description="Conversation identifier"),
):
    # CRITICAL: Generate a unique filename to prevent race conditions 
    # if multiple requests hit this endpoint at the same time.
    temp_filename = f"temp_recording_{uuid.uuid4().hex}.webm" 
    
    try:
        await audio_file.seek(0)
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
            
        logger.info(f"File stored. Size: {os.path.getsize(temp_filename)} bytes")

        audio_tensor = whisper.load_audio(temp_filename)
        audio_tensor = whisper.pad_or_trim(audio_tensor)
        logger.info(f"Audio tensor shape: {audio_tensor.shape}, dtype: {audio_tensor.dtype}")

        # Make log-mel spectrogram and move to the model's device
        mel = whisper.log_mel_spectrogram(audio_tensor).to(GLOBAL_WHISPER_MODEL.device)

        # Detect the spoken language
        _, probs = GLOBAL_WHISPER_MODEL.detect_language(mel)
        detected_lang = max(probs, key=probs.get)

        print(f"Detected language: {detected_lang} (Confidence: {probs[detected_lang]:.2f})")

        # Check if it is English or not, then transcribe or translate
        if detected_lang == "en":
            print("Audio is English. Transcribing...")
            trasncribedText = GLOBAL_WHISPER_MODEL.transcribe(temp_filename, language="en")
        else:
            print(f"Audio is non-English ({detected_lang}). Translating to English...")
            trasncribedText = GLOBAL_WHISPER_MODEL.transcribe(temp_filename, task="translate")
        
        # Whisper hands this to system ffmpeg to extract raw audio track seamlessly
        #trasncribedText = GLOBAL_WHISPER_MODEL.transcribe(temp_filename, fp16=False)
        logger.info(f"Transcription result: {trasncribedText['text']}")

        result = {"response": "No transcribed text found.", session_id: session_id}

        # Move processing inside the try block so it only runs on success
        if(not(trasncribedText['text'].strip() == "")):
            result = processUserQuery(userQuery=trasncribedText['text'], session_id=session_id)
            print(f"Processed result: {result}")
        
        return result

    except Exception as e:
        print(f"inside exception block: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Guaranteed cleanup of the temporary video/audio chunk
        if os.path.exists(temp_filename):
           os.remove(temp_filename)

@app.post("/contact/")
async def submit_contact_form(form: ContactForm):
    if not SMTP_PASSWORD_CACHE:
        raise HTTPException(status_code=500, detail="Server email configuration error")
   
    msg = EmailMessage()
    msg.set_content(f"Name: {form.name}\nEmail: {form.email}\n\nMessage:\n{form.message}")
    
    msg['Subject'] = f"PrimaCura Contact Form: Message from {form.name}"
    msg['From'] = "contactprimacura@gmail.com"
    msg['To'] = "contactprimacura@gmail.com"

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login("contactprimacura@gmail.com", SMTP_PASSWORD_CACHE)
        server.send_message(msg)
        server.quit()
        
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


def processUserQuery(userQuery: str, session_id: str = "default"):
    runtime = get_runtime()
    conversation = _conversation_for(session_id)

    # Conversation is mutable, so keep a single local request from interleaving
    # turns with another request using the same session.
    with _conversation_lock:
        out = pchTriage.run_triage_agent(
            userQuery,
            conversation,
            dataset=runtime.dataset,
            classifier=runtime.classifier,
            age_sensitive=runtime.age_sensitive,
            llm=None if _llm_switched_off else runtime.llm,
            gate=runtime.gate,
        )
    logger.info("status=%s condition=%s llm=%s (%s ms)%s", out["status"], out["condition"],
                out.get("llm_label"), out.get("llm_ms"), " [discarded by gate]" if out.get("discarded") else "")
    return _serialize_agent_output(out, session_id)

def _steps_from_agent_response(response: str) -> list[str]:
    """Convert a successful numbered protocol into frontend checklist steps."""

    steps = []
    for line in str(response).splitlines():
        line = line.strip()
        if not line:
            continue
        steps.append(re.sub(r"^\d+\.\s*", "", line))
    return steps


def _serialize_agent_output(out: dict[str, Any], session_id: str) -> dict[str, Any]:
    status = out["status"]
    is_protocol = status == "success"
    return {
        "status": status,
        # Only name a condition once we show its protocol.
        "title": out["condition"] if is_protocol else "",
        "steps": _steps_from_agent_response(out["response"]) if is_protocol else [],
        "message": out["response"] if not is_protocol else "",
        "confidence": round(float(out["confidence"]), 3),
        # Tappable answers for clarification / age questions. Sending one back
        # verbatim as the next query always resolves the question.
        "options": out.get("options", []) if not is_protocol else [],
        # One line per option, same order: what the condition looks like ("" for
        # age and breathing answers, which need no explanation).
        "option_hints": [pchTriage.option_hint(o) for o in out.get("options", [])] if not is_protocol else [],
        "session_id": session_id,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
