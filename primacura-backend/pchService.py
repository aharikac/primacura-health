#!/usr/bin/env python
# coding: utf-8

# # First-Aid App — local version
# 
# The offline retrieval pipeline, running on your own machine. No Colab, no Drive
# mount, no API key required.
# 
# **To run this:** `pixi run lab` from the repository root, then open this file.
# Everything below executes top to bottom with no interactive prompts.
# 
# The original Colab notebook is kept unchanged at `FirstAidApp_WithoutAPIKey.ipynb`
# for reference. This one imports its logic from `firstaid.py` so the notebook, the
# tests, and the smoke script cannot drift apart.

# In[1]:


import re
import sys
import time
import shutil
import os
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from threading import RLock
from typing import Any
import logging
import pandas as pd
import uvicorn
from fastapi import Body, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import pchCore
from pchCore import CONFIG, Conversation, load_dataset, load_embedding_model


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
    table: Any
    age_sensitive: set[str]


@lru_cache(maxsize=1)
def get_runtime() -> FirstAidRuntime:
    """Load MedBERT and build the tiny protocol index exactly once per process."""

    dataset = load_dataset()
    model = load_embedding_model()
    table = pchCore.build_index(dataset, model)
    return FirstAidRuntime(
        dataset=dataset,
        model=model,
        table=table,
        age_sensitive=pchCore.age_sensitive_conditions(dataset),
    )


_conversations: dict[str, Conversation] = {}
_conversation_lock = RLock()


def _conversation_for(session_id: str) -> Conversation:
    key = (session_id or "default").strip()[:128] or "default"
    with _conversation_lock:
        return _conversations.setdefault(key, Conversation())


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm the model and protocol vectors before accepting the first query. The
    # app may take a few seconds to become ready, but every request thereafter
    # performs only query inference + retrieval.
    get_runtime()
    yield



app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(([a-zA-Z0-9-]+\.)*primacura\.health|(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat/")
def chat_endpoint(
    query: str = Body(..., embed=True, description="User query for first aid advice"),
    session_id: str = Body("default", embed=True, description="Conversation identifier"),
):
    result = processUserQuery(query, session_id=session_id)
    #result = f"Processed: {userQuery}" 
    return result

@app.post("/transcribe/")
async def speak_endpoint(
    audio_file: UploadFile = File(...),
    session_id: str = Body("default", embed=True, description="Conversation identifier"),
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


def processUserQuery(userQuery: str, session_id: str = "default"):
    # Repo root, so `import firstaid` works no matter where Jupyter was launched.
    sys.path.insert(0, str(Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()))

    pd.set_option("display.max_colwidth", 70)

    runtime = get_runtime()
    conversation = _conversation_for(session_id)

    # Conversation is mutable, so keep a single local request from interleaving
    # turns with another request using the same session.
    with _conversation_lock:
        out = pchCore.run_first_aid_chat_agent(
            userQuery,
            conversation,
            table=runtime.table,
            model=runtime.model,
            age_sensitive=runtime.age_sensitive,
        )
    print(f"\nStatus: {out['status']}\n")
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
        # Do not leak a nearest-neighbour guess to clients while abstaining.
        "title": out["condition"] if is_protocol else "",
        "steps": _steps_from_agent_response(out["response"]) if is_protocol else [],
        "message": out["response"] if not is_protocol else "",
        "distance": out["distance"],
        "session_id": session_id,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
