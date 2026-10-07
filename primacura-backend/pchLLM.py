"""Small local LLM used as a second opinion when the classifier is unsure.

The LLM only ever picks one label from the fixed list of conditions (enforced
with a JSON schema), so it can never write medical instructions: the protocol
text still comes verbatim from the approved dataset.

It runs in Ollama next to the backend (a separate container in
docker-compose), so no user text leaves our own server. Every failure mode
(Ollama down, model missing, slow CPU, odd output) returns None and the app
falls back to the classifier's tap-to-pick list, so the LLM can make answers
better but never blocks one.

Config (environment variables):
    PRIMACURA_LLM_URL      default http://localhost:11434 (http://ollama:11434 in compose)
    PRIMACURA_LLM_MODEL    default qwen3:4b (chosen 2026-10-05: most accurate without adding wrong answers
                           among qwen3:1.7b, qwen3:4b, llama3.2:3b, gemma3:4b; Apache-2.0 licence)
    PRIMACURA_LLM_TIMEOUT  seconds, default 6 (slower answers fall back to the tap list)
    PRIMACURA_LLM_ENABLED  "0" to switch the LLM off entirely
"""
from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

from pchCore import KNOWN_CONDITIONS

log = logging.getLogger("uvicorn.error")

OUT_OF_SCOPE = "Out of scope"
UNSURE = "Unsure"
LABELS = KNOWN_CONDITIONS + [OUT_OF_SCOPE, UNSURE]

# One line per label. Kept short: on a small CPU every prompt token costs time,
# and this block is identical on every call so Ollama can cache it.
_LABEL_GUIDE = {
    "Cardiac Arrest": "unresponsive and not breathing normally (no breathing, only gasping, no pulse)",
    "Cardiac Arrest (Drowning)": "unresponsive or not breathing after being in or under water",
    "Heart Attack": "awake person with chest pain, pressure or tightness, may spread to arm, jaw or back",
    "Choking": "awake but cannot breathe, cough or speak because food or an object is stuck",
    "Anaphylaxis": "allergic reaction: swelling of face, lips or tongue, hives, wheezing, throat tightness",
    "Diabetic Emergency": "person with diabetes who is shaky, sweaty, confused or drowsy (low blood sugar)",
    "Stroke": "sudden face droop, one-sided weakness or numbness, slurred speech, sudden vision loss",
    "Opioid Overdose": "after opioids, drugs or pain pills: very hard to wake, slow or shallow breathing, tiny pupils",
    "Severe Bleeding": "heavy bleeding from a wound that will not stop",
    "Burns (Chemical to Eye)": "chemical, cleaner or other substance splashed or sprayed into the eyes",
    "Burns (Thermal)": "burn or scald from heat, fire, steam, hot liquid or hot objects",
    "Poisoning / Ingestion": "swallowed, drank or inhaled something harmful (chemicals, too many pills, toxic plants, fumes)",
    "Seizures": "shaking or jerking, stiff body, eyes rolled back, convulsions",
    "Head, Neck, or Spinal Injury": "hurt in a fall, crash, dive or blow: head injury, neck or back pain, numbness or paralysis",
    OUT_OF_SCOPE: "not one of the emergencies above, minor problems, or general questions",
    UNSURE: "not enough information to choose",
}

SYSTEM_PROMPT = (
    "You classify emergency descriptions for a first-aid app. Pick the ONE category that best "
    "matches what the user describes. Use only what is described; do not guess beyond it. "
    "Never give advice.\n\nCategories:\n"
    + "\n".join(f"- {label}: {guide}" for label, guide in _LABEL_GUIDE.items())
    + '\n\nReply with JSON only: {"condition": "<category>"}'
)

_SCHEMA = {
    "type": "object",
    "properties": {"condition": {"type": "string", "enum": LABELS}},
    "required": ["condition"],
}


@dataclass
class LLMResult:
    label: str | None      # one of LABELS, or None when the LLM was unavailable
    latency_ms: int
    error: str = ""


class LLMClassifier:
    def __init__(self, url: str | None = None, model: str | None = None, timeout: float | None = None,
                 extra_options: dict | None = None):
        self.url = (url or os.getenv("PRIMACURA_LLM_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.getenv("PRIMACURA_LLM_MODEL", "qwen3:4b")
        self.timeout = float(timeout or os.getenv("PRIMACURA_LLM_TIMEOUT", "6"))
        # Extra Ollama runtime options, e.g. {"num_thread": 4, "num_gpu": 0} to benchmark CPU-only speed.
        self.extra_options = dict(extra_options or {})
        # Qwen3 "thinking" adds seconds of hidden reasoning; we only need a label.
        # Models without thinking support reject the flag, so we learn that once.
        self._send_think_flag = True

    def classify(self, text: str) -> LLMResult:
        started = time.monotonic()
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text.strip()[:1000]},
            ],
            "format": _SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_predict": 24, "num_ctx": 2048, **self.extra_options},
        }
        if self._send_think_flag:
            body["think"] = False
        try:
            reply = self._post("/api/chat", body)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            if self._send_think_flag and "think" in detail.lower():
                self._send_think_flag = False
                return self.classify(text)
            return LLMResult(None, _ms(started), f"HTTP {exc.code}: {detail[:200]}")
        except Exception as exc:  # network down, timeout, bad JSON from server
            return LLMResult(None, _ms(started), f"{type(exc).__name__}: {exc}")

        content = reply.get("message", {}).get("content", "")
        label = _parse_label(content)
        if label is None:
            return LLMResult(None, _ms(started), f"unparseable reply: {content[:120]!r}")
        return LLMResult(label, _ms(started))

    def warm_up(self) -> None:
        """Load the model into memory so the first real request is not slow."""
        result = self.classify("My friend has a small cut on her finger.")
        if result.label is None:
            log.warning("LLM %s unavailable at %s: %s", self.model, self.url, result.error)
        else:
            log.info("LLM %s ready (%d ms warm-up)", self.model, result.latency_ms)

    def _post(self, path: str, body: dict) -> dict:
        request = urllib.request.Request(
            self.url + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            return json.loads(response.read())


def _parse_label(content: str) -> str | None:
    content = content.strip()
    if "</think>" in content:  # defensive: strip any reasoning that slipped through
        content = content.split("</think>", 1)[1].strip()
    try:
        label = json.loads(content).get("condition")
    except (json.JSONDecodeError, AttributeError):
        return None
    return label if label in LABELS else None


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def load_llm() -> LLMClassifier | None:
    """The configured LLM, or None when PRIMACURA_LLM_ENABLED=0."""
    if os.getenv("PRIMACURA_LLM_ENABLED", "1") == "0":
        return None
    return LLMClassifier()
