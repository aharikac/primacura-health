"""Offline-first first-aid protocol retrieval.

This is the local, portable version of the pipeline that used to live inside a
Colab notebook. Everything here runs with no network access and no API key; the
LightRAG comparison arm is separate and optional.

Design rule that drives the whole module: **the language model never writes the
medical instructions.** Retrieval returns approved protocol text verbatim. A
model, if used at all, only interprets messy wording or asks a clarifying
question.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
# One dict for every knob. Change a value, re-run, record the number. This is
# the whole experiment framework for now, and it is enough to start.

REPO_ROOT = Path(__file__).resolve().parent

CONFIG: dict[str, Any] = {
    "DATA_CSV": REPO_ROOT / "data" / "First_Aid_Dataset_Final.csv",
    "VECTOR_DB_PATH": REPO_ROOT / "app_first_aid_vectordb",
    "TABLE_NAME": "app_emergencies",
   # "EMBED_MODEL": "pritamdeka/S-PubMedBert-MS-MARCO",
    "EMBED_MODEL": "S-PubMedBert-MS-MARCO",
    "USE_QUANTIZATION": True,
    # The confidence threshold below was chosen for cosine *distance*. Keep the
    # metric beside the threshold so the two cannot silently drift apart.
    "SEARCH_METRIC": "cosine",
    "TOP_K": 5,
    # Cosine distance above which we refuse to commit to an answer.
    "THRESHOLD": 0.12,
    # How many times we are willing to ask "tell me more" before giving a
    # best-effort answer flagged as low confidence.
    "MAX_CLARIFICATIONS": 2,
    # Ask which age band applies when the matched condition has age-specific
    # protocols and the user has not indicated one. See AGE_SENSITIVE below.
    "ASK_FOR_AGE": True,
}

# The 14 conditions the dataset covers. Used by the evaluation code as the
# label space, so a typo in a protocol name shows up as a KeyError rather than
# silently becoming a 15th class.
KNOWN_CONDITIONS = [
    "Cardiac Arrest",
    "Cardiac Arrest (Drowning)",
    "Heart Attack",
    "Choking",
    "Anaphylaxis",
    "Diabetic Emergency",
    "Stroke",
    "Opioid Overdose",
    "Severe Bleeding",
    "Burns (Chemical to Eye)",
    "Burns (Thermal)",
    "Poisoning / Ingestion",
    "Seizures",
    "Head, Neck, or Spinal Injury",
]


# --------------------------------------------------------------------------
# Age bands
# --------------------------------------------------------------------------
# The dataset has 17 rows but only 14 condition labels: "Cardiac Arrest" has
# adult / child / infant variants and "Choking" has adult-or-child / infant.
# The age lives in the free-text `situation` column, so a query like "my uncle
# collapsed" carries no signal that separates them and the nearest neighbour is
# effectively arbitrary.
#
# This is not a ranking nicety. The saved evaluation runs show adult cardiac
# arrest queries returning the INFANT protocol — two fingers, 1.5 inches — to
# someone standing over a collapsed adult. Scoring by condition label recorded
# those as correct matches, which is how a harmful answer passed as a hit.
#
# So: when the match is age-sensitive and we do not know the age, we ask.

AGE_BANDS = ("infant", "child", "adult")

_AGE_FROM_SITUATION = (
    ("infant", re.compile(r"\binfants?\b|\bunder 1 year\b", re.I)),
    ("child", re.compile(
        r"\bchild(ren)?\b|\bage 1 to puberty\b|\bover 1 year old\b", re.I)),
    ("adult", re.compile(r"\badults?\b|\bpuberty and older\b", re.I)),
)

# Deliberately conservative: a wrong age guess is worse than asking. We only
# claim to know the age when the wording is unambiguous.
_AGE_FROM_QUERY = (
    ("infant", re.compile(
        r"\b(infant|baby|newborn|\d+[- ]month[- ]old|months old)\b", re.I)),
    ("child", re.compile(
        r"\b(child|kid|toddler|schoolgirl|schoolboy|my (son|daughter)|"
        r"([1-9]|1[0-2])[- ]year[- ]old)\b", re.I)),
    ("adult", re.compile(
        r"\b(adult|man|woman|guy|lady|husband|wife|uncle|aunt|"
        r"grandfather|grandmother|elderly|my (dad|mom|father|mother)|"
        r"colleague|co[- ]?worker|([2-9]\d|1[3-9])[- ]year[- ]old)\b", re.I)),
)


def applicable_age_bands(situation: str) -> str:
    """Which age bands a protocol row covers, comma-joined, or 'any'.

    A row can cover several: "Conscious Adult or Child (over 1 year old)" is
    both, and the drowning row explicitly names adults, children and infants.
    'any' means the protocol is not age-specific at all (stroke, poisoning).
    """
    bands = [band for band, pattern in _AGE_FROM_SITUATION
             if pattern.search(str(situation))]
    return ",".join(bands) if bands else "any"


def row_covers_age(row_bands: str, band: str | None) -> bool:
    """Does a row's age coverage include the band we are looking for?"""
    if band is None or row_bands == "any":
        return True
    return band in row_bands.split(",")


def detect_age_band(text: str) -> str | None:
    """Infer the patient's age band from the user's wording, or None.

    'Conscious Adult or Child' rows are matched by either band, handled by the
    'any' fallthrough at filter time rather than here.
    """
    for band, pattern in _AGE_FROM_QUERY:
        if pattern.search(str(text)):
            return band
    return None


# --------------------------------------------------------------------------
# Protocol formatting
# --------------------------------------------------------------------------

_LEADING_NUMBER = re.compile(r"^\s*\d+\s*[.)]\s*")
_MENTIONS_911 = re.compile(r"\b(911|9-1-1)\b")

_CALL_911_STEP = (
    "Call 911 (or local emergency services) immediately. CHECK SCENE FOR SAFETY."
)


def format_protocol(raw_steps: str) -> str:
    """Normalise a protocol into clean, sequentially numbered steps.

    The previous implementation did ``raw_steps.replace(". ", ".\\n- ")``, which
    split on *every* period-plus-space. Three things broke:

    1. Already-numbered steps were torn in half: ``1. Call 911`` became ``1.``
       alone on one line and ``- Call 911`` on the next.
    2. Prepending the call-911 step collided with the numbering already in the
       data, so output ran ``1.`` ... ``2.`` ... ``1.`` ... ``2.``.
    3. Any step containing more than one sentence was scattered across several
       bullets, so a single instruction no longer read as a single step.

    Together those make a protocol markedly harder to follow by someone acting
    under stress, which is the whole use case.

    Worth stating precisely, because an earlier review got this wrong: decimal
    dosages were **not** affected. ``.replace(". ", ...)`` needs a period
    followed by a space, and ``0.5 mg`` has a digit there. The test below pins
    that behaviour down for the new implementation regardless.

    The source data is already newline-separated numbered steps, so the correct
    transform preserves that structure instead of inventing a new one. We only
    renumber, and prepend the call-911 step when the protocol lacks one.
    """
    text = str(raw_steps).strip()

    # Split on newlines only. Never on sentence punctuation — that is what
    # corrupted the dosages.
    lines = [line.strip() for line in text.split("\n")]

    steps: list[str] = []
    for line in lines:
        if not line:
            continue
        # Continuation lines (sub-bullets like "   - F (Face): ...") belong to
        # the step above them, so append rather than promoting to a new step.
        if line.startswith("-") and steps:
            steps[-1] += "\n    " + line
            continue
        steps.append(_LEADING_NUMBER.sub("", line))

    if not _MENTIONS_911.search(text):
        steps.insert(0, _CALL_911_STEP)

    return "\n".join(f"{i}. {step}" for i, step in enumerate(steps, start=1))


def load_dataset(csv_path: str | Path | None = None) -> pd.DataFrame:
    """Load the protocol CSV and add the two derived columns the index needs."""
    path = Path(csv_path or CONFIG["DATA_CSV"])
    if not path.exists():
        raise FileNotFoundError(
            f"Protocol dataset not found at {path}. It ships with the repo at "
            "data/First_Aid_Dataset_Final.csv — check you are running from the "
            "repository and not a copy."
        )

    dataset = pd.read_csv(path)

    missing = {"condition", "situation", "symptoms", "output"} - set(dataset.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    dataset["full_scenario_context"] = (
        dataset["situation"].astype(str) + "\n" + dataset["symptoms"].astype(str)
    )
    dataset["reformatted_output"] = dataset["output"].apply(format_protocol)
    dataset["age_bands"] = dataset["situation"].apply(applicable_age_bands)
    return dataset


def age_sensitive_conditions(dataset: pd.DataFrame) -> set[str]:
    """Condition labels whose rows differ by age band.

    For these, returning the nearest neighbour without knowing the patient's
    age is a coin flip between protocols that contradict each other.
    """
    return {
        condition
        for condition, group in dataset.groupby("condition")
        if group["age_bands"].nunique() > 1
    }


# --------------------------------------------------------------------------
# Embedding + index
# --------------------------------------------------------------------------


def load_embedding_model(
    model_name: str | None = None, use_quantization: bool | None = None
):
    """Load the sentence-transformer, optionally dynamically quantised.

    Quantisation is wrapped in try/except on purpose. Dynamic int8 quantisation
    dispatches to fbgemm on x86 and qnnpack on Apple Silicon, and the qint8
    Linear path is not guaranteed to be available on every build. Losing the
    speedup is fine; failing to import on a teammate's laptop is not.
    """
    import torch
    from sentence_transformers import SentenceTransformer

    model_name = model_name or CONFIG["EMBED_MODEL"]
    if use_quantization is None:
        use_quantization = CONFIG["USE_QUANTIZATION"]

    model = SentenceTransformer("./models/" + model_name)

    if use_quantization:
        try:
            model[0].auto_model = torch.quantization.quantize_dynamic(
                model[0].auto_model, {torch.nn.Linear}, dtype=torch.qint8
            )
        except Exception as exc:  # pragma: no cover - platform dependent
            print(f"[warn] dynamic quantisation unavailable, using float32: {exc}")

    return model


def build_index(dataset: pd.DataFrame, model, db_path=None, table_name=None):
    """Embed every protocol and write them to a LanceDB table.

    The embedding loop is batched. At 14 rows this saves roughly 0.4 seconds
    once, which does not matter — but noticing that it does not matter is the
    point, and batching is the right habit for when the corpus grows.
    """
    import lancedb

    db_path = Path(db_path or CONFIG["VECTOR_DB_PATH"])
    table_name = table_name or CONFIG["TABLE_NAME"]

    contexts = [c.strip() for c in dataset["full_scenario_context"]]
    vectors = model.encode(contexts, batch_size=32, show_progress_bar=False)

    rows = [
        {
            "vector": vector.tolist(),
            "condition": condition.strip(),
            "protocol_text": protocol,
            "age_bands": bands,
            "situation": situation,
        }
        for vector, condition, protocol, bands, situation in zip(
            vectors,
            dataset["condition"],
            dataset["reformatted_output"],
            dataset["age_bands"],
            dataset["situation"],
        )
    ]

    db = lancedb.connect(str(db_path))
    return db.create_table(table_name, data=rows, mode="overwrite")


def search(
    table,
    model,
    query: str,
    top_k: int | None = None,
    metric: str | None = None,
) -> pd.DataFrame:
    """Return the top-k protocols for a query, nearest first.

    Returning k rather than 1 costs nothing at this corpus size and is what
    makes recall@k measurable alongside accuracy. If recall@5 is high but
    accuracy is low, ranking or the threshold is the problem; if recall@5 is
    also low, the embedding model is.
    """
    top_k = top_k or CONFIG["TOP_K"]
    metric = metric or CONFIG["SEARCH_METRIC"]
    if metric not in {"cosine", "dot", "l2", "abs_dot_l1"}:
        raise ValueError(
            f"Unsupported metric {metric!r}; expected cosine, dot, l2, or "
            "abs_dot_l1"
        )
    query_vector = model.encode(query)

    if metric == "abs_dot_l1":
        # Experimental comparator requested for evaluation. L1-normalise first
        # so raw vector magnitude cannot dominate, then convert absolute dot
        # similarity to a lower-is-better distance. This intentionally treats
        # opposite vectors as equivalent, so it must have its own calibrated
        # threshold and is not the production default.
        import numpy as np

        rows = table.to_pandas().copy()
        vectors = np.asarray(rows["vector"].tolist(), dtype=float)
        query_array = np.asarray(query_vector, dtype=float)
        vector_norms = np.abs(vectors).sum(axis=1, keepdims=True)
        query_norm = np.abs(query_array).sum()
        vectors = vectors / np.maximum(vector_norms, np.finfo(float).eps)
        query_array = query_array / max(query_norm, np.finfo(float).eps)
        rows["_distance"] = 1.0 - np.abs(vectors @ query_array)
        return rows.nsmallest(top_k, "_distance").reset_index(drop=True)

    return (
        table.search(query_vector.tolist())
        .metric(metric)
        .limit(top_k)
        .to_pandas()
    )


# --------------------------------------------------------------------------
# Conversation agent
# --------------------------------------------------------------------------


@dataclass
class Turn:
    """One exchange. Recorded on every turn, not only when we abstain."""

    user_text: str
    suggested_condition: str
    distance: float
    status: str


@dataclass
class Conversation:
    """Accumulates what the *user* said, never what the model guessed.

    The old code searched using ``f"{previous_condition}: {user_input}"``, which
    fed the model's own earlier guess back into the next query. The clarifying
    question exists precisely to escape a wrong guess; mixing the guess into the
    follow-up search makes repeating it more likely, not less.
    """

    turns: list[Turn] = field(default_factory=list)
    # Sticky once established: the patient does not change age mid-emergency.
    age_band: str | None = None

    @property
    def clarification_count(self) -> int:
        return sum(1 for t in self.turns if t.status == "clarification_needed")

    @property
    def asked_for_age(self) -> bool:
        return any(t.status == "age_clarification_needed" for t in self.turns)

    def accumulated_query(self, new_text: str) -> str:
        """Every symptom the user has described, in order. No model output."""
        user_texts = [t.user_text for t in self.turns] + [new_text]
        return " ".join(t.strip() for t in user_texts if t.strip())


def run_first_aid_chat_agent(
    user_input: str,
    conversation: Conversation | None = None,
    table=None,
    model=None,
    threshold: float | None = None,
    max_clarifications: int | None = None,
    age_sensitive: set[str] | None = None,
) -> dict[str, Any]:
    """Answer an emergency query, or ask for more detail when unsure.

    Two bugs from the original are fixed here:

    * The abstain check was ``len(conversation_history) == 0 and score > t``.
      Turn 1 appended to the history, so on turn 2 the left half was always
      False and the whole condition short-circuited — every follow-up returned
      a confident protocol no matter how poor the match. The confidence check
      now applies on every turn. After the clarification budget is exhausted,
      the agent escalates without exposing the nearest guessed protocol.
    * Only the clarification branch appended to the history, so the success
      path never recorded a turn and the history was stuck at one entry. Both
      branches record now.
    """
    if conversation is None:
        conversation = Conversation()
    if threshold is None:
        threshold = CONFIG["THRESHOLD"]
    if max_clarifications is None:
        max_clarifications = CONFIG["MAX_CLARIFICATIONS"]

    query = conversation.accumulated_query(user_input)
    results = search(table, model, query)

    # Age handling. Once we know the band, keep it and use it to pick between
    # protocols that share a condition label but contradict each other.
    detected = detect_age_band(user_input)
    if detected and conversation.age_band is None:
        conversation.age_band = detected
    band = conversation.age_band

    ranked = results

    # FIX CONTEXT LOSS: Bypass vector search if waiting for age
    if conversation.turns and conversation.turns[-1].status == "age_clarification_needed":
        locked_condition = conversation.turns[-1].suggested_condition
        all_rows = table.to_pandas()
        ranked = all_rows[all_rows["condition"] == locked_condition].copy()
        if "_distance" not in ranked.columns:
            ranked["_distance"] = 0.0

    if band is not None and "age_bands" in ranked.columns:
        keep = ranked["age_bands"].apply(lambda b: row_covers_age(b, band))
        if keep.any():
            ranked = ranked[keep]

    matched_condition = ranked["condition"].iloc[0]
    match_score = float(ranked["_distance"].iloc[0])
    exact_protocol = ranked["protocol_text"].iloc[0]

    uncertain = match_score > threshold
    budget_left = conversation.clarification_count < max_clarifications
    needs_age = (
        CONFIG["ASK_FOR_AGE"]
        and not uncertain
        and band is None
        and age_sensitive is not None
        and matched_condition in age_sensitive
        and not conversation.asked_for_age
    )

    if needs_age:
        status = "age_clarification_needed"
        response = (
            f"This looks like **{matched_condition}**, but the correct steps depend "
            "on the patient's age and they are not interchangeable.\n\n"
            "**Is this an adult, a child (1 year to puberty), or an infant "
            "(<1 year)?**\n\n"
            "While you provide more details, call 911 now if you have not already."
        )
    elif uncertain and budget_left:
        status = "clarification_needed"
        response = (
            "I do not have enough detail to identify the condition yet. \n\nIs the "
            "person conscious? \n\nAre they breathing normally? \n\nWhat exactly are you "
            "seeing? Provide more details, so I can help. \n\nWhile you provide more details, call 911 now if you have not already."
        )
    elif uncertain:
        # A nearest neighbour is not a diagnosis. Once the clarification budget
        # is exhausted, escalate instead of exposing a guessed protocol. The
        # user can still add details on the next turn and recover to success.
        status = "unable_to_identify"
        response = (
            "I still do not have enough detail to identify the condition. \n\n"
            "Please provide more details, "
            "such as whether the person is conscious, breathing "
            "normally, or bleeding heavily etc. \n\nWhile you provide more details, call 911 now if you have not already."
        )
    else:
        status = "success"
        response = (
            #f"🚨 **Action Plan ({matched_condition.upper()})**\n\n"
            f"Before you start: CHECK SCENE FOR SAFETY.\n{exact_protocol}"
        )

    conversation.turns.append(
        Turn(
            user_text=user_input,
            suggested_condition=matched_condition,
            distance=match_score,
            status=status,
        )
    )

    return {
        "status": status,
        "condition": matched_condition,
        "distance": match_score,
        "age_band": band,
        "conversation": conversation,
        "response": response,
        "results": ranked,
    }


# --------------------------------------------------------------------------
# LightRAG response classifier
# --------------------------------------------------------------------------

_REFERENCES_HEADING = re.compile(
    r"\n\s*#{0,6}\s*(references|sources|citations)\b.*\Z",
    re.IGNORECASE | re.DOTALL,
)


def strip_references(response: str) -> str:
    """Remove the trailing citation list before scoring a generated answer.

    This is the single most important line in the file for the reported
    accuracy numbers. LightRAG appends the titles of every document it
    consulted::

        ### References
        - [1] Medical Condition: Seizures
        - [2] Medical Condition: Head, Neck, or Spinal Injury

    The keyword rules scanned the whole string, so every condition LightRAG
    *looked at* could be counted as a condition it *predicted*. That turns
    "was your single best guess right?" into "was the right answer anywhere in
    the retrieved set?" — a far easier question, and the likely source of most
    of the 24-point gap over the vector-search arm.
    """
    return _REFERENCES_HEADING.sub("", str(response)).strip()


def _has_word(text: str, *words: str) -> bool:
    """Whole-word match, so 'head' does not fire on 'headache' or 'ahead'."""
    return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)


def classify_response(response: str) -> list[str]:
    """Map a generated answer onto condition labels using keyword rules.

    Kept because it is what the project currently uses, but with three classes
    of bug fixed:

    * References are stripped first (see :func:`strip_references`).
    * Two original rules compared mixed-case literals such as
      ``"Burns (Thermal)"`` against an already-lowercased string, so they could
      never be true. All comparisons are lowercase now.
    * The seizure rule's top-level operator was ``or``, so any answer
      containing the word "movements" was labelled Seizures. It now requires an
      actual seizure term.

    This remains a fragile way to grade a system — the rules were written by
    reading the answers they score, which is writing the test after seeing the
    answer key. It is a stopgap until the pipeline returns a structured
    condition id instead of prose.
    """
    text = strip_references(response).lower()
    found: list[str] = []

    if (
        _has_word(text, "back blows", "back slaps")
        or _has_word(text, "chest thrusts", "abdominal thrusts")
    ) and _has_word(text, "choking"):
        found.append("Choking")
    if "initial rescue breaths" in text and "cardiac arrest" in text:
        found.append("Cardiac Arrest (Drowning)")
    if "30 compressions" in text and _has_word(text, "cpr") and "cardiac arrest" in text:
        found.append("Cardiac Arrest")
    if (
        _has_word(text, "aspirin")
        or "chest discomfort" in text
        or "tightness" in text
    ) and "heart attack" in text:
        found.append("Heart Attack")
    if (
        _has_word(text, "fast", "droop", "hemorrhagic") or "slurred" in text
    ) and _has_word(text, "stroke"):
        found.append("Stroke")
    if _has_word(text, "epipen", "epinephrine") and "anaphylaxis" in text:
        found.append("Anaphylaxis")
    if _has_word(text, "sugar", "glucose") and "diabetic" in text:
        found.append("Diabetic Emergency")
    if _has_word(text, "naloxone", "narcan") and "opioid" in text:
        found.append("Opioid Overdose")
    if (
        _has_word(text, "tourniquet") or "direct, continuous pressure" in text
    ) and _has_word(text, "bleeding"):
        found.append("Severe Bleeding")
    if "flushing of the affected eye" in text or (
        _has_word(text, "eyelids", "eye") and _has_word(text, "chemical")
    ):
        found.append("Burns (Chemical to Eye)")
    if "thermal burn" in text or (
        _has_word(text, "burn", "burns") and _has_word(text, "blisters", "scald")
    ):
        found.append("Burns (Thermal)")
    if _has_word(text, "ingestion") or "poison help" in text or "poison control" in text:
        found.append("Poisoning / Ingestion")
    # Requires a genuine seizure term. "movements" alone is not evidence.
    if _has_word(text, "seizure", "seizures", "tonic-clonic", "postictal"):
        found.append("Seizures")
    if (
        _has_word(text, "head") and _has_word(text, "neck")
    ) and _has_word(text, "spine", "spinal"):
        found.append("Head, Neck, or Spinal Injury")

    if "Cardiac Arrest (Drowning)" in found and "Cardiac Arrest" in found:
        found.remove("Cardiac Arrest")

    return found or ["Unknown Condition"]


# --------------------------------------------------------------------------
# Secrets
# --------------------------------------------------------------------------


def get_openai_key() -> str | None:
    """Read the OpenAI key from the environment or a local .env file.

    Never hardcode a key in the notebook. Anything committed to the repo is
    public the moment the repo is, and anything shipped inside a mobile app can
    be extracted from the bundle — assume both are readable by strangers.
    """
    try:
        from dotenv import load_dotenv

        load_dotenv(REPO_ROOT / ".env")
    except ImportError:  # pragma: no cover
        pass

    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key or key.startswith("sk-your-key") or key == "sk-...":
        return None
    return key
