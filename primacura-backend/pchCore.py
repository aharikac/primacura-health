"""Shared building blocks for PrimaCura's first-aid engine.

What lives here:
  * CONFIG and the list of conditions the app covers
  * loading the approved protocols (data/First_Aid_Dataset_Final.csv)
  * patient age bands (some protocols differ for infants, children and adults)
  * the two-way clarifying questions and how typed answers to them are read
  * the conversation record kept for each session
  * loading the sentence-embedding model

The decision logic (safety question, classifier, tap-to-pick) is in
pchTriage.py; the optional LLM second opinion is in pchLLM.py.

Design rule: **no model ever writes medical instructions.** Models only pick
which approved protocol to show; the steps are always the dataset's text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent

CONFIG: dict[str, Any] = {
    "DATA_CSV": REPO_ROOT / "data" / "First_Aid_Dataset_Final.csv",
    "TRAINING_CSV": REPO_ROOT / "data" / "master-training-examples.csv",
    # Nonsense filter (pchGate): its junk / real examples and the emergency
    # words that always keep a message. Retrained at startup like the classifier.
    "GATE_CSV": REPO_ROOT / "data" / "master-gate-examples.csv",
    "GATE_WORDS": REPO_ROOT / "data" / "emergency-words.txt",
    # Chosen 2026-10-06 on messages the gate never trained on: C=100 with a
    # 0.9 cut-off dropped 35 of 38 new junk messages and kept all 508 test
    # messages (highest real p(junk): 0.58 for an emergency, 0.85 for
    # "what time is it", which the classifier then calls Out of scope).
    "GATE_C": 100.0,
    "GATE_JUNK_PROB": 0.9,
    # Cached embeddings of the training examples (a Docker volume in production).
    "CACHE_DIR": REPO_ROOT / "app_first_aid_vectordb",
    # How many cache files to keep. Each startup uses two (classifier and
    # nonsense filter); older ones are deleted when a new one is written.
    "CACHE_KEEP": 4,
    "EMBED_MODEL": "S-PubMedBert-MS-MARCO",
    "USE_QUANTIZATION": True,
    # Classifier: logistic regression strength, and the probability needed to
    # show a protocol without asking. 0.5 gave ~1% wrong answers on validation.
    "CLASSIFIER_C": 10.0,
    "COMMIT_PROB": 0.5,
    # Between COMMIT_PROB and CONFIRM_PROB the classifier is right most of the
    # time but every wrong answer we had (Oct 6, 508 test queries) sat there.
    # In that band a protocol is shown only if the LLM picks the same
    # condition; otherwise the tap list. With no LLM answer (switched off,
    # down or too slow) COMMIT_PROB applies as before.
    "CONFIRM_PROB": 0.65,
    # Tap-to-pick: how many conditions to offer, and how many times to offer.
    # 2 since 2026-10-06: across the 508 test messages the right condition was
    # 1st 45 times, 2nd 13 times and never 3rd; "None of these" covers the rest.
    "PICKER_SIZE": 2,
    "MAX_PICKERS": 2,
    # LLM second opinion (pchLLM): when the classifier is unsure, show the
    # LLM's choice directly only if it is among the classifier's top K
    # conditions. K=1 (the LLM must confirm the classifier's best guess) added
    # no wrong answers on validation; K=3 gave a few more direct answers but
    # one more wrong one. Otherwise the LLM's pick goes first in the tap list.
    "LLM_AGREE_TOP_K": 1,
}

# The 14 conditions the dataset covers.
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
# The steps contradict each other (two fingers and 1.5 inches for an infant vs
# two hands and 2 inches for an adult), so when the patient's age matters and
# the user has not said it, the app asks.

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
        r"\b(child|kid|toddler|schoolgirl|schoolboy|girl|boy|my (son|daughter)|"
        r"([1-9]|1[0-2])[- ]year[- ]old)\b", re.I)),
    ("adult", re.compile(
        r"\b(adult|man|woman|guy|lady|husband|wife|uncle|aunt|"
        r"grandfather|grandmother|elderly|my (dad|mom|father|mother)|"
        r"colleague|co[- ]?worker|([2-9]\d|1[3-9])[- ]year[- ]old)\b", re.I)),
)

# --------------------------------------------------------------------------
# Clarifying questions between two conditions
# --------------------------------------------------------------------------
# When the classifier is unsure it offers its top conditions as buttons
# (pchTriage). The one case that gets a dedicated question instead is
# "cardiac arrest: in water or not?", because the two CPR protocols differ
# (drowning starts with rescue breaths).
#
# Each entry lists, per side, the phrases that count as choosing that side
# when the user types or speaks an answer instead of tapping a button. Rules,
# enforced by _validate_clarification_pairs at import time:
#
# * Whole phrases on word boundaries. A phrase is never a fragment of a
#   condition's display name, and never a stopword: "to", "or", "and" and
#   friends cannot select anything.
# * A phrase belongs to one side only. A phrase on both sides cannot tell
#   them apart.
# * Negation ("not in the water") is checked within the same clause, up to
#   three words back. See phrase_hits.

CLARIFICATION_PAIRS: dict[frozenset, dict[str, Any]] = {
    frozenset(["Cardiac Arrest", "Cardiac Arrest (Drowning)"]): {
        "question": "Did this happen in or after being in water (Drowning), or did the person collapse on dry land (Cardiac Arrest)?",
        "answers": {
            "Cardiac Arrest (Drowning)": ["drowning", "drowned", "water", "pool", "lake", "ocean", "sea", "river", "bathtub", "bath", "tub", "underwater", "submerged", "swimming", "beach"],
            "Cardiac Arrest": ["dry land", "on land", "collapsed normally", "collapse normally", "just collapsed", "on the floor", "on the ground"],
        },
    },
}

AGE_OPTIONS = ["Adult", "Child (1 year to puberty)", "Infant (under 1 year)"]

# Words that must never decide an answer on their own.
_STOPWORDS = frozenset(
    "a an and are as at be but by for from he her him his i if in into is it its "
    "me my no not of on or our she so than that the their them they this to "
    "was we were with you your yes yeah".split()
)

_NEGATOR = re.compile(
    r"\b(not|no|never|isn'?t|wasn'?t|aren'?t|weren'?t|didn'?t|doesn'?t|don'?t|"
    r"hasn'?t|haven'?t|can'?t|cannot|won'?t|without|neither|nor)\b", re.I
)
_CLAUSE_BREAK = re.compile(r"[.,;:!?]|\bbut\b|\bhowever\b|\bthough\b", re.I)


def normalise_answer(text: str) -> str:
    """Lowercase, straighten curly apostrophes, collapse whitespace."""
    text = str(text).replace("\u2019", "'").replace("\u2018", "'").lower()
    return re.sub(r"\s+", " ", text).strip()


def phrase_hits(text: str, phrase: str):
    """Yield one bool per whole-phrase occurrence: True if it is negated.

    Negation counts only inside the same clause and within three words, so in
    "he's not choking, he's limp" the "not" negates "choking" but not "limp".
    Phrases that start with a negator themselves ("not breathing") are never
    treated as negated by that same word.
    """
    words = [re.escape(w) for w in phrase.split()]
    pattern = re.compile(r"(?<![\w'])" + r"\s+".join(words) + r"(?![\w'])", re.I)
    phrase_is_negative = bool(_NEGATOR.match(phrase))
    for match in pattern.finditer(text):
        clause = _CLAUSE_BREAK.split(text[: match.start()])[-1]
        window = " ".join(clause.split()[-3:])
        yield (not phrase_is_negative) and bool(_NEGATOR.search(window))


def resolve_clarification_answer(answer: str, options: list[str]) -> str | None:
    """Map the user's reply to a two-way question onto one option, or None.

    Order of precedence:
    1. The exact option label, which is what a tapped button sends.
    2. Curated answer phrases (CLARIFICATION_PAIRS): exactly one option has
       a non-negated hit and none of its hits are negated.
    3. "Not X" with nothing else said picks the other option of a pair.

    Anything else returns None and the caller searches normally. Returning
    None is always safer than guessing from a word that happens to occur in a
    condition's display name.
    """
    text = normalise_answer(answer)
    for option in options:
        if text == option.lower():
            return option

    pair = CLARIFICATION_PAIRS.get(frozenset(options))
    if pair is None:
        return None

    positive: set[str] = set()
    negative: set[str] = set()
    for option in options:
        for phrase in pair["answers"].get(option, []):
            for negated in phrase_hits(text, phrase):
                (negative if negated else positive).add(option)

    chosen = positive - negative
    if len(chosen) == 1:
        return chosen.pop()
    if not positive and len(negative) == 1 and len(options) == 2:
        return (set(options) - negative).pop()
    return None


def _validate_clarification_pairs() -> None:
    """Fail at import, not in front of a user, if the phrase table is unsafe."""
    for pair, spec in CLARIFICATION_PAIRS.items():
        assert set(spec["answers"]) == set(pair), f"answers do not cover {set(pair)}"
        assert all(c in KNOWN_CONDITIONS for c in pair), f"unknown condition in {set(pair)}"
        sides = list(spec["answers"].values())
        shared = set(sides[0]) & set(sides[1])
        assert not shared, f"phrases on both sides of {set(pair)}: {shared}"
        for phrases in sides:
            for phrase in phrases:
                assert phrase == phrase.lower().strip(), f"phrase must be lowercase: {phrase!r}"
                assert phrase not in _STOPWORDS, f"stopword used as an answer phrase: {phrase!r}"


_validate_clarification_pairs()


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

    The source text is already one numbered step per line. We keep that
    structure, renumber, fold "- sub-bullet" lines into the step above, and
    add a "Call 911" first step when the protocol does not mention 911.
    Lines are split on newlines only, never on sentence punctuation, so a
    step with several sentences (or a dose like 0.5 mg) stays intact.
    """
    text = str(raw_steps).strip()

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
    """Load the protocol CSV and add the formatted steps and age coverage."""
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

    dataset["condition"] = dataset["condition"].astype(str).str.strip()
    dataset["reformatted_output"] = dataset["output"].apply(format_protocol)
    dataset["age_bands"] = dataset["situation"].apply(applicable_age_bands)
    return dataset


def age_sensitive_conditions(dataset: pd.DataFrame) -> set[str]:
    """Condition labels whose rows differ by age band.

    For these (Cardiac Arrest, Choking) the steps contradict each other across
    ages, so the app must know the patient's age before showing a protocol.
    """
    return {
        condition
        for condition, group in dataset.groupby("condition")
        if group["age_bands"].nunique() > 1
    }


# --------------------------------------------------------------------------
# Conversation record
# --------------------------------------------------------------------------


@dataclass
class Turn:
    """One exchange: what the user sent and what the app replied with."""

    user_text: str
    condition: str          # the condition the app showed or was leaning towards
    confidence: float       # classifier probability for that condition (0-1)
    status: str             # success | clarification_needed | age_clarification_needed | unable_to_identify
    options: list[str] = field(default_factory=list)  # buttons offered with the reply
    # Which question the reply asked: "triage", "picker", "pair", "age",
    # "describe", or "protocol" when a protocol was shown.
    kind: str = ""
    # True when user_text was a tapped button rather than a description, so it
    # is left out of the text the classifier reads.
    was_option: bool = False


@dataclass
class Conversation:
    """What the user has told us so far. Never contains model guesses."""

    turns: list[Turn] = field(default_factory=list)
    # Sticky once known: the patient does not change age mid-emergency.
    age_band: str | None = None
    # Answers to the safety question: responsive = "responsive" | "unresponsive",
    # breathing = "absent" | "present" | "slow" | "normal".
    responsive: str | None = None
    breathing: str | None = None
    # Set once the LLM has picked a different condition than the classifier's
    # best guess. From then on no protocol is shown without the LLM agreeing.
    llm_disagreed: bool = False


# --------------------------------------------------------------------------
# Embedding model
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

    model = SentenceTransformer(str(REPO_ROOT / "models" / model_name))

    if use_quantization:
        try:
            model[0].auto_model = torch.quantization.quantize_dynamic(
                model[0].auto_model, {torch.nn.Linear}, dtype=torch.qint8
            )
        except Exception as exc:  # pragma: no cover - platform dependent
            print(f"[warn] dynamic quantisation unavailable, using float32: {exc}")

    return model
