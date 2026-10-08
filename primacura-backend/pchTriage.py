"""PrimaCura's decision engine: which first-aid protocol to show, or what to ask.

For each message the engine works through these steps:

0. Nonsense gate (optional, pchGate). The first message of a conversation is
   dropped, with a "please describe what is happening" reply, only when it is
   almost certainly junk and names no emergency word.
1. Safety question. If the report sounds like someone has collapsed and does
   not say whether they are breathing, ask one tap question first: are they
   responding, and are they breathing normally? "Not responding and not
   breathing" goes straight to CPR (the drowning variant if water is
   involved), following AHA guidance for anyone unresponsive and not
   breathing normally.
2. Classifier. Logistic regression over sentence embeddings, trained at
   startup on data/master-training-examples.csv (everyday phrasings per
   condition; edit that file directly to add or fix examples).
   Safety answers constrain it: an awake person cannot be in cardiac arrest,
   and an unresponsive person with no sign of a blocked airway is never given
   the conscious-choking steps.
   Negated mentions ("he doesn't have diabetes") are removed from what the
   classifier reads, and a message about an animal gets a vet / animal
   poison line reply instead of a protocol.
3. LLM second opinion (optional, pchLLM). Show the protocol straight away
   only when the classifier is confident (CONFIG["CONFIRM_PROB"]). Below that,
   show it only if the LLM picks the classifier's best guess. With no LLM
   answer, CONFIG["COMMIT_PROB"] is the bar, as before.
4. Otherwise offer the top conditions as buttons, each with a one-line
   description, plus "None of these"; the LLM's pick goes first.

No model writes medical instructions: the steps shown are always the approved
text from data/First_Aid_Dataset_Final.csv.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pchCore import (
    SAFETY_STEP,
    _STOPWORDS,
    AGE_OPTIONS,
    CLARIFICATION_PAIRS,
    CONFIG,
    Conversation,
    Turn,
    detect_age_band,
    normalise_answer,
    phrase_hits,
    resolve_clarification_answer,
    row_covers_age,
)

logger = logging.getLogger(__name__)

OUT_OF_SCOPE = "Out of scope"
NONE_OPTION = "None of these"
ARREST = "Cardiac Arrest"
DROWNING = "Cardiac Arrest (Drowning)"
# No reply text mentions 911: the clarification screen in both apps always
# shows the one "CHECK SCENE FOR SAFETY. If it's life-threatening, call 911
# immediately." box above the message, so repeating it here only duplicated it.

# One line per condition, shown next to each tap option.
CONDITION_CUES = {
    "Cardiac Arrest": "not responding and not breathing normally",
    "Cardiac Arrest (Drowning)": "pulled from water, not responding or not breathing",
    "Heart Attack": "awake, with chest pain or pressure",
    "Choking": "awake but can't breathe, cough or speak; something stuck",
    "Anaphylaxis": "allergic reaction: swelling, hives, trouble breathing",
    "Diabetic Emergency": "has diabetes; shaky, sweaty, confused (low sugar)",
    "Stroke": "sudden face droop, one-sided weakness or slurred speech",
    "Opioid Overdose": "after drugs or pain pills; very hard to wake, slow breathing",
    "Severe Bleeding": "blood flowing heavily from a wound",
    "Burns (Chemical to Eye)": "chemical splashed into the eyes",
    "Burns (Thermal)": "burn from heat, fire, steam or hot liquid",
    "Poisoning / Ingestion": "swallowed or breathed in something harmful",
    "Seizures": "shaking or jerking, stiff, eyes rolled back",
    "Head, Neck, or Spinal Injury": "hurt in a fall, crash or blow to the head, neck or back",
}



def option_hint(option: str) -> str:
    """One line shown under a button: what the condition looks like, or what the choice does."""
    if option == NONE_OPTION:
        return "Describe what you see instead"
    cue = CONDITION_CUES.get(option, "")
    return cue[:1].upper() + cue[1:]


# --------------------------------------------------------------------------
# Reading the safety state (responsive? breathing?) from free text
# --------------------------------------------------------------------------
TRIAGE_ARREST = "Not responding and not breathing (or only gasping)"
TRIAGE_UNRESPONSIVE_BREATHING = "Not responding, but breathing"
TRIAGE_AWAKE = "Awake and responding"
TRIAGE_OPTIONS = [TRIAGE_ARREST, TRIAGE_UNRESPONSIVE_BREATHING, TRIAGE_AWAKE]

_COLLAPSE = re.compile(
    r"\b(unconscious|unresponsive|not responsive|non-?responsive|(?:not|isn'?t|is not) responding|won'?t (?:respond|wake|answer)|"
    r"not waking|can'?t wake|will not wake|not answering|passed out|knocked out|out cold|limp|floppy|"
    r"collapsed|collaps\w*|fainted|keeled over|slumped|went down|fell over|hit the deck|not moving|"
    r"(?:isn'?t|is not|stopped|no longer) moving|"
    r"dropped (?:down|dead|(?:to|on|onto) the (?:floor|ground))|went still|neither responsive)\b",
    re.I,
)
_SEIZURE_ACTIVITY = re.compile(r"\b(shak\w*|jerk\w*|convuls\w*|seiz\w*|twitch\w*|spasm\w*|fit|stiff|rigid)\b", re.I)

# Breathing, checked in this order: absent, then slow/abnormal, then normal.
# "can't breathe" is deliberately NOT absent: it describes a conscious person
# struggling (choking, anaphylaxis), not someone who has stopped breathing.
_BREATHING_ABSENT = re.compile(
    r"\b(not breathing|isn'?t breathing|is not breathing|no breath(?:ing|s)?|stopped breathing|zero breathing|"
    r"not (?:taking|making) (?:any )?breaths?|won'?t breathe|nor breathing|or breathe|"
    # "isn't moving or breathing", "not responding and breathing", ...
    r"(?:not|isn'?t|is not|no longer) \w+ (?:or|nor|and) breathing|"
    r"no pulse|no heartbeat|can'?t (?:feel|find) (?:a |his |her |their )?(?:pulse|heartbeat)|"
    r"chest (?:isn'?t|is not) moving|can'?t see (?:the |his |her |their )?chest moving)\b",
    re.I,
)
# Gasping counts as "not breathing normally" only for someone who has
# collapsed. A conscious person "gasping" is struggling (choking, allergy).
_BREATHING_GASPING = re.compile(r"\b(only gasp\w*|gasping|gasps|agonal|breathless)\b", re.I)
_BREATHING_SLOW = re.compile(
    r"\b(barely breathing|breathing (?:is )?(?:very |really |super |so )?(?:slow|shallow|low|weird)\w*|"
    r"slow(?:ly)? breath\w*|breathing slowly|shallow breath\w*|breathing shallowly|snoring|gurgling|"
    r"few breaths)\b",
    re.I,
)
_BREATHING_NORMAL = re.compile(
    r"\b(breathing normally|breathing fine|breathing ok(?:ay)?|is breathing|still breathing|"
    r"(?:he|she|they)'?(?:s|re) breathing|but breathing)\b",
    re.I,
)
_RESPONSIVE_WORDS = ["awake", "conscious", "talking", "alert", "responding", "responsive", "answering", "speaking"]

# Water mentioned: the drowning CPR protocol applies (rescue breaths first).
_WATER = re.compile(
    r"(?<!\bnot )(?<!\bno )\b(pool|lake|water|bathtub|bath|drowning|drowned|drown|near[- ]?drown\w*|underwater|swimm\w*|ocean|sea|river|tub|pond|creek|stream|canal|reservoir|quarry|beach|surf|waves?|kayak|canoe|boat|dock|pier|(?:went|was|slipped|pulled|got) under(?!\s+(?:an(?:a)?esthesia|general|sedation)))\b", re.I
)
# Evidence that the airway is blocked by something. Without any of these, an
# unresponsive person is not given the conscious-choking protocol.
_AIRWAY_OBSTRUCTION = re.compile(
    r"\b(chok\w*|gag\w*|cough\w*|stuck|swallow\w*|eating|ate|food|candy|toy|coin|grape|hot ?dog|piece|bite|"
    r"windpipe|throat|heimlich)\b",
    re.I,
)


def breathing_state(text: str) -> str | None:
    if re.search(r"\bnot breathing normally\b", text, re.I) or _BREATHING_ABSENT.search(text):
        return "absent"
    if _BREATHING_GASPING.search(text) and _COLLAPSE.search(text):
        return "absent"
    if _BREATHING_SLOW.search(text):
        return "slow"
    if _BREATHING_NORMAL.search(text):
        return "normal"
    return None


def responsive_state(text: str) -> str | None:
    if _COLLAPSE.search(text):
        return "unresponsive"
    normalised = normalise_answer(text)
    if any(not negated for word in _RESPONSIVE_WORDS for negated in phrase_hits(normalised, word)):
        return "responsive"
    return None


def triage_from_reply(answer: str) -> tuple[str | None, str | None]:
    """Map a reply to the safety question onto (responsive, breathing)."""
    a = normalise_answer(answer)
    if a == TRIAGE_ARREST.lower():
        return "unresponsive", "absent"
    if a == TRIAGE_UNRESPONSIVE_BREATHING.lower():
        return "unresponsive", "present"
    if a == TRIAGE_AWAKE.lower():
        return "responsive", None
    breathing = breathing_state(answer)
    responsive = responsive_state(answer)
    if breathing == "absent" and responsive is None:
        responsive = "unresponsive"
    return responsive, breathing


# --------------------------------------------------------------------------
# Classifier
# --------------------------------------------------------------------------
@dataclass
class ConditionClassifier:
    model: Any
    clf: Any
    classes: np.ndarray

    @classmethod
    def train(cls, model, csv_path: str | Path | None = None, cache_dir: str | Path | None = None,
              C: float | None = None) -> "ConditionClassifier":
        from sklearn.linear_model import LogisticRegression

        data = pd.read_csv(Path(csv_path or CONFIG["TRAINING_CSV"]))
        texts = [classifier_text(t) for t in data["text"].astype(str)]
        labels = data["condition"].astype(str).to_numpy()
        vectors = _cached_embeddings(model, texts, Path(cache_dir or CONFIG["CACHE_DIR"]))
        clf = LogisticRegression(C=C or CONFIG["CLASSIFIER_C"], max_iter=5000)
        clf.fit(vectors, labels)
        return cls(model=model, clf=clf, classes=clf.classes_)

    def probabilities(self, text: str) -> dict[str, float]:
        vector = _encode(self.model, [classifier_text(text)])
        return dict(zip(self.classes, self.clf.predict_proba(vector)[0].tolist()))


def _encode(model, texts: list[str]) -> np.ndarray:
    vectors = np.asarray(model.encode(texts, batch_size=64, show_progress_bar=False, convert_to_numpy=True),
                         dtype="float32")
    return vectors / np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-12)


def _model_signature(model) -> str:
    """Identifies the exact embedding setup (quantised on CPU servers, float32 on a Mac GPU)."""
    try:
        inner = type(model[0].auto_model).__name__
        quantised = any("quantized" in type(m).__module__ for m in model[0].auto_model.modules())
    except Exception:  # stub models in tests
        inner, quantised = type(model).__name__, False
    return f"{CONFIG['EMBED_MODEL']}|{inner}|q={quantised}"


def _cached_embeddings(model, texts: list[str], cache_dir: Path) -> np.ndarray:
    """Embed the training texts once; reuse while the texts and model setup are unchanged."""
    key = hashlib.sha256(("\n".join(texts) + "|" + _model_signature(model)).encode()).hexdigest()[:16]
    path = cache_dir / f"training_embeddings_{key}.npy"
    if path.exists():
        _touch(path)  # mark as in use, so pruning keeps it
        return np.load(path)
    vectors = _encode(model, texts)
    cache_dir.mkdir(parents=True, exist_ok=True)
    np.save(path, vectors)
    _prune_cache(cache_dir, CONFIG["CACHE_KEEP"])
    return vectors


def _touch(path: Path) -> None:
    try:
        os.utime(path)
    except OSError:
        pass


def _prune_cache(cache_dir: Path, keep: int) -> None:
    """Delete all but the `keep` most recently used embedding caches.

    A new cache file appears whenever the training or gate examples change, so
    without this the folder (a Docker volume in production) grows on every such
    deploy. Files in use this startup were just written or touched, so they are
    always among the newest. Never fails startup.
    """
    try:
        files = sorted(cache_dir.glob("training_embeddings_*.npy"),
                       key=lambda f: f.stat().st_mtime, reverse=True)
        for old in files[keep:]:
            old.unlink(missing_ok=True)
            logger.info("Deleted old embedding cache %s", old.name)
    except OSError as exc:
        logger.warning("Could not prune the embedding cache: %s", exc)


# --------------------------------------------------------------------------
# The engine
# --------------------------------------------------------------------------
def pick_protocol(dataset: pd.DataFrame, condition: str, band: str | None) -> str:
    """The approved steps for a condition, choosing the age variant when known."""
    rows = dataset[dataset["condition"] == condition]
    if band is not None:
        fitting = rows[rows["age_bands"].apply(lambda b: row_covers_age(b, band))]
        if not fitting.empty:
            rows = fitting
    return rows["reformatted_output"].iloc[0]


@dataclass
class _Reply:
    """Collects the reply for one message and records it in the conversation."""

    user_input: str
    conversation: Conversation
    dataset: pd.DataFrame
    age_sensitive: set[str]
    llm_label: str | None = None
    llm_ms: int | None = None
    extra: dict = field(default_factory=dict)

    def finish(self, status: str, condition: str, response: str, kind: str,
               options: list[str] | None = None, was_option: bool = False, confidence: float = 0.0):
        options = list(options or [])
        self.conversation.turns.append(Turn(
            user_text=self.user_input, condition=condition or "", confidence=confidence, status=status,
            options=options, kind=kind, was_option=was_option))
        return {
            "status": status,
            "condition": condition or "",
            "confidence": confidence,
            "options": options if status != "success" else [],
            "response": response,
            "age_band": self.conversation.age_band,
            "llm_label": self.llm_label,
            "llm_ms": self.llm_ms,
            "conversation": self.conversation,
        }

    def protocol(self, condition: str, confidence: float, was_option: bool = False, reask_age: bool = False):
        """Show the protocol, first asking the patient's age when the steps depend on it.

        reask_age: ask again even though the age question was answered before
        (the person went back to the condition options and picked again).
        """
        conv = self.conversation
        if condition in self.age_sensitive and reask_age:
            conv.age_band = None
        if (condition in self.age_sensitive and conv.age_band is None
                and (reask_age or not any(t.kind == "age" for t in conv.turns))):
            return self.finish(
                "age_clarification_needed", condition,
                f"This looks like **{condition}**, but the correct steps depend on the patient's age and they "
                "are not interchangeable.\n\n**Is this an adult, a child (1 year to puberty), or an infant "
                f"(under 1 year)?**",
                "age", AGE_OPTIONS, was_option, confidence)
        steps = pick_protocol(self.dataset, condition, conv.age_band)
        return self.finish("success", condition, f"{SAFETY_STEP}\n{steps}",
                           "protocol", None, was_option, confidence)


def run_triage_agent(
    user_input: str,
    conversation: Conversation | None,
    dataset: pd.DataFrame,
    classifier: ConditionClassifier,
    age_sensitive: set[str],
    llm=None,
    gate=None,
) -> dict[str, Any]:
    """Handle one user message (typed text or a tapped option) and return the reply."""
    conversation = conversation or Conversation()

    # Step 0: a first message that is junk is dropped without a trace, so it
    # cannot use up a question or set an age (pchGate). Answers to our own
    # questions are never gated.
    if gate is not None and not conversation.turns and not gate.keep(user_input):
        from pchGate import DISCARD_REPLY
        return {
            "status": "clarification_needed", "condition": "", "confidence": 0.0, "options": [],
            "response": DISCARD_REPLY, "age_band": conversation.age_band, "llm_label": None,
            "llm_ms": None, "conversation": conversation, "discarded": True,
        }
    reply = _Reply(user_input, conversation, dataset, age_sensitive)
    last = conversation.turns[-1] if conversation.turns else None
    answer = normalise_answer(user_input)

    detected = detect_age_band(user_input)
    if detected and conversation.age_band is None:
        conversation.age_band = detected

    # Back to an earlier question. The apps' Back buttons step back through the
    # questions already asked (steps -> age question -> condition options), and
    # the person may then tap a different button. A tap that matches a button of
    # an earlier question, rather than of the last one, answers that question.
    last_options = {o.lower() for o in last.options} if last is not None and last.status != "success" else set()
    if last is not None and answer not in last_options:
        earlier = next((t for t in reversed(conversation.turns)
                        if t.status != "success" and t.kind.removesuffix(_AGAIN) in ("picker", "pair", "age")
                        and any(o.lower() == answer for o in t.options)), None)
        if earlier is not None:
            earlier_kind = earlier.kind.removesuffix(_AGAIN)
            tapped = next(o for o in earlier.options if o.lower() == answer)
            if earlier_kind == "age":
                conversation.age_band = detect_age_band(tapped) or conversation.age_band
                return reply.protocol(earlier.condition, 1.0, was_option=True)
            if tapped == NONE_OPTION:
                return reply.finish(
                    "clarification_needed", "",
                    "Okay. Please describe what you see in a few words: what happened, whether the person is "
                    "awake, and whether they are breathing normally.",
                    "describe", was_option=True)
            # Returning to a condition: if the age came from our age question (not
            # from their own words, e.g. "my 6 month old"), ask it again rather
            # than silently reuse the earlier answer.
            asked_age = any(t.kind.removesuffix(_AGAIN) == "age" for t in conversation.turns)
            return reply.protocol(tapped, 1.0, was_option=True, reask_age=asked_age)

    # Replies to a question we just asked.
    if last is not None and last.status != "success":
        kind = last.kind.removesuffix(_AGAIN)
        # A reply that is only an age, "yes"/"no" or filler adds nothing to the
        # description. Re-reading the whole conversation with it would only let
        # those words tip the classifier, so ask the same question again (once).
        if (kind in ("picker", "pair", "triage") and last.options and not last.kind.endswith(_AGAIN)
                and answer not in {o.lower() for o in last.options} and is_uninformative(user_input)):
            return _ask_again(reply, last, kind)

        if kind == "age":
            return reply.protocol(last.condition, 1.0, was_option=answer in {o.lower() for o in AGE_OPTIONS})

        if kind in ("picker", "pair") and last.options:
            for option in last.options:
                if answer == option.lower() and option != NONE_OPTION:
                    return reply.protocol(option, 1.0, was_option=True)
            if answer == NONE_OPTION.lower():
                return reply.finish(
                    "clarification_needed", "",
                    "Okay. Please describe what you see in a few words: what happened, whether the person is "
                    f"awake, and whether they are breathing normally.",
                    "describe", was_option=True)
            if kind == "pair":
                choice = resolve_clarification_answer(user_input, last.options)
                if choice:
                    return reply.protocol(choice, 1.0)

        if kind == "triage":
            responsive, breathing = triage_from_reply(user_input)
            conversation.responsive = responsive or conversation.responsive
            conversation.breathing = breathing or conversation.breathing
            was_option = answer in {o.lower() for o in TRIAGE_OPTIONS}
            return _decide(reply, classifier, llm, was_option)

    return _decide(reply, classifier, llm, was_option=False)


# Negated mentions of a condition ("he doesn't have diabetes", "she didn't hit
# her head", "no chemicals involved"). Sentence embeddings largely ignore the
# "not", so these are removed from what the classifier reads. Ability words
# (can't, won't, couldn't) are not negations of a cause: "can't swallow" and
# "can't breathe" are symptoms and stay. The LLM still sees the full text.
_NEGATION_CUE = (r"(?:not|no|never|without|doesn'?t|didn'?t|isn'?t|wasn'?t|hasn'?t|haven'?t|hadn'?t|"
                 r"aren'?t|weren'?t|does not|did not|is not|was not|has not)")
_NEGATED_MENTION = re.compile(
    rf"\b{_NEGATION_CUE}(?:\s+[\w']+){{0,3}}?\s+(?:diabet\w*|epilep\w*|seizures?|allerg\w*|chemicals?|bleach|"
    r"drugs?|overdos\w*|opioids?|heroin|pills?|alcohol|stuck|chok\w*|chest|head|fall|fell|burn\w*|stroke|water)\b"
    r"(?:\s+(?:or|nor)\s+[\w']+)*",
    re.I,
)


def classifier_text(text: str) -> str:
    """What the classifier reads (training and live): no negated causes."""
    return strip_negated(text)


def strip_negated(text: str) -> str:
    """Text for the classifier, without negated mentions of a condition."""
    stripped = _NEGATED_MENTION.sub(" ", text)
    return re.sub(r"\s{2,}", " ", stripped).strip() or text


# Animal patients are out of scope. Fires only when an animal is mentioned and
# nothing points at a person being hurt: no person words, no bite or attack,
# and no first-person injury ("I got bit by my dog", "I fell over the cat").
_ANIMAL = re.compile(r"\b(?:dogs?|pupp(?:y|ies)|pup|cats?|kittens?|pets?|birds?|parrots?|hamsters?|rabbits?|bunny|"
                     r"ferrets?|guinea pigs?|horses?)(?:'s)?\b", re.I)
_PERSON = re.compile(
    r"\b(?:he|she|him|her|they|them|someone|somebody|anyone|person|people|man|woman|guy|lady|boy|girl|child|"
    r"children|kids?|toddler|baby|infant|newborn|son|daughter|husband|wife|mom|mum|mother|dad|father|brother|"
    r"sister|friend|partner|boyfriend|girlfriend|grandma|grandpa|grandmother|grandfather|aunt|uncle|cousin|"
    r"niece|nephew|neighbou?r|coworker|roommate|patient|student|teen\w*|humans?|rider)\b", re.I)
# Includes riding falls ("fell off horse landed on neck"): the rider is the patient.
_ANIMAL_HURT_PERSON = re.compile(r"\b(?:bit|bite|bitten|attack\w*|scratch\w*|mauled|kick\w*|knocked|"
                                 r"fell\s+off|thrown|bucked|trampled|stepped\s+on|riding)\b", re.I)
_FIRST_PERSON_HARM = re.compile(
    r"\b(?:i|i'm|im|i've)\s+(?:just\s+)?(?:hurt|hit|fell|cut|burn\w*|got|was|am|swallowed|ate|took|feel|can't|"
    r"cant|think i)\b", re.I)
PET_REPLY = (
    "PrimaCura's guides are for people, not animals. For a pet emergency, call your vet or an emergency "
    "animal hospital now. In the US you can also call the ASPCA Animal Poison Control Center at "
    "(888) 426-4435 (a fee may apply).\n\nIf a person is hurt or unwell too, tell me what is happening to them."
)


def is_animal_only(text: str) -> bool:
    return bool(_ANIMAL.search(text)) and not (
        _PERSON.search(text) or _ANIMAL_HURT_PERSON.search(text) or _FIRST_PERSON_HARM.search(text))


_AGAIN = "-again"
_FILLER = frozenset(
    "ok okay um uh hmm please help hurry quick quickly thanks thank sure idk dunno know don't dont i'm im "
    "she's hes he's they're it's its adult adults child kid kids infant baby toddler teen teenager year years yr "
    "yrs month months week weeks old age aged grown man woman boy girl guy lady puberty under over".split()
)


def is_uninformative(text: str) -> bool:
    """True if the text is only an age, yes/no or filler words."""
    words = re.findall(r"[a-z0-9']+", normalise_answer(text))
    return all(w in _STOPWORDS or w in _FILLER or w.isdigit() for w in words)


def _ask_again(reply: "_Reply", last: Turn, kind: str):
    if kind == "triage":
        text = ("**Is the person responding to you, and are they breathing normally?** Tap the answer that "
                f"fits best.\n\nGasping is not normal breathing.")
    elif kind == "pair":
        text = f"**{CLARIFICATION_PAIRS[frozenset(last.options)]['question']}**"
    else:
        text = f"Thanks. **Please tap the one that matches best.**"
    # Recorded like a button tap (was_option=True) so the age or filler words are
    # never added to the text the classifier reads later; the age itself is
    # already saved in conversation.age_band.
    return reply.finish("clarification_needed", last.condition, text, kind + _AGAIN, last.options,
                        True, last.confidence)


def _described_text(conversation: Conversation, new_text: str, new_is_option: bool) -> str:
    """Everything the user has described so far, leaving out button taps."""
    parts = [t.user_text for t in conversation.turns if not t.was_option]
    if not new_is_option:
        parts.append(new_text)
    return " ".join(p.strip() for p in parts if p and p.strip())


def _apply_safety_state(probs: dict[str, float], responsive: str | None, breathing: str | None,
                        text: str) -> dict[str, float]:
    p = dict(probs)
    if responsive == "responsive" or breathing in ("present", "normal", "slow"):
        p[ARREST] = 0.0
        p[DROWNING] = 0.0
    if responsive == "unresponsive" and not _AIRWAY_OBSTRUCTION.search(text):
        p["Choking"] = 0.0
    total = sum(p.values())
    return {k: v / total for k, v in p.items()} if total > 0 else probs


def _decide(reply: _Reply, classifier: ConditionClassifier, llm, was_option: bool):
    conv = reply.conversation
    text = _described_text(conv, reply.user_input, was_option)
    responsive = conv.responsive or responsive_state(text)
    breathing = conv.breathing or breathing_state(text)
    if breathing == "absent" and responsive is None and not _AIRWAY_OBSTRUCTION.search(text):
        responsive = "unresponsive"

    # Step 0b: an animal is the patient -> vet / animal poison line, no protocol.
    if text and not was_option and is_animal_only(text):
        return reply.finish("clarification_needed", "", PET_REPLY, "describe", [], was_option, 0.0)

    if text:
        probs = classifier.probabilities(text)
    else:
        probs = {c: 1.0 / len(classifier.classes) for c in classifier.classes}

    # Step 1a: not responding and not breathing -> CPR (drowning variant if water).
    # Water-word rule: the drowning steps are shown directly only when the user
    # mentions water. If the classifier merely leans towards drowning, ask.
    if responsive == "unresponsive" and breathing == "absent":
        p_drown, p_arrest = probs.get(DROWNING, 0.0), probs.get(ARREST, 0.0)
        share = p_drown / (p_drown + p_arrest) if (p_drown + p_arrest) > 0 else 0.0
        if _WATER.search(text):
            return reply.protocol(DROWNING, max(p_drown, 0.5), was_option)
        if share >= 0.35 and p_drown >= 0.10 and not any(t.kind == "pair" for t in conv.turns):
            question = CLARIFICATION_PAIRS[frozenset([ARREST, DROWNING])]["question"]
            return reply.finish("clarification_needed", ARREST, f"**{question}**",
                                "pair", [DROWNING, ARREST], was_option, p_arrest)
        return reply.protocol(ARREST, max(p_arrest, 0.5), was_option)

    # Step 1b: someone collapsed, breathing unknown -> ask the safety question once.
    if (responsive == "unresponsive" and breathing is None and not _SEIZURE_ACTIVITY.search(text)
            and not any(t.kind == "triage" for t in conv.turns)):
        return reply.finish(
            "clarification_needed", "",
            "**Is the person responding to you, and are they breathing normally?**\n\n"
            f"Gasping is not normal breathing.",
            "triage", TRIAGE_OPTIONS, was_option)

    # Step 2: classifier, constrained by what we know about the person.
    probs = _apply_safety_state(probs, responsive, breathing, text)
    ranked = [c for c, _ in sorted(probs.items(), key=lambda kv: kv[1], reverse=True)]
    top, p_top = ranked[0], probs[ranked[0]]
    if top != OUT_OF_SCOPE and p_top >= CONFIG["CONFIRM_PROB"] and not conv.llm_disagreed:
        return reply.protocol(top, p_top, was_option)

    # Step 3: the classifier is not sure enough; ask the LLM for a second opinion.
    # Its pick is shown only if it is the classifier's best guess.
    llm_pick = None
    llm_answered = False
    if llm is not None and text:
        result = llm.classify(text)
        reply.llm_label, reply.llm_ms = result.label, result.latency_ms
        llm_answered = result.label is not None
        # Ignore labels the safety answers rule out (e.g. arrest for someone awake).
        if result.label in probs and (probs[result.label] > 0 or result.label == OUT_OF_SCOPE):
            llm_pick = result.label
        if llm_pick and llm_pick != top:
            conv.llm_disagreed = True
        top_k = ranked[: CONFIG["LLM_AGREE_TOP_K"]]
        if llm_pick and llm_pick != OUT_OF_SCOPE and llm_pick in top_k:
            return reply.protocol(llm_pick, probs[llm_pick], was_option)

    # No LLM answer (switched off, down or too slow): the plain threshold applies.
    if (not llm_answered and not conv.llm_disagreed and top != OUT_OF_SCOPE
            and p_top >= CONFIG["COMMIT_PROB"]):
        return reply.protocol(top, p_top, was_option)

    # Step 4: offer the most likely conditions as buttons.
    pickers = sum(1 for t in conv.turns if t.kind == "picker")
    offered_before = {o for t in conv.turns if t.kind == "picker" for o in t.options}
    declined = any(t.kind == "describe" for t in conv.turns)
    candidates = [c for c in ranked if c != OUT_OF_SCOPE and not (declined and c in offered_before)]
    if llm_pick and llm_pick != OUT_OF_SCOPE and llm_pick in candidates:
        candidates.remove(llm_pick)
        candidates.insert(0, llm_pick)
    options = candidates[: CONFIG["PICKER_SIZE"]] + [NONE_OPTION]

    if pickers >= CONFIG["MAX_PICKERS"]:
        return reply.finish(
            "unable_to_identify", top,
            "I still can't tell which emergency this is. **Tap the guide that fits best**, or describe "
            "what you see.",
            "picker", options, was_option, p_top)

    out_of_scope = top == OUT_OF_SCOPE and llm_pick in (None, OUT_OF_SCOPE)
    if out_of_scope:
        intro = ("This doesn't look like one of the emergencies PrimaCura covers. "
                 "**If one of these matches, tap it.**")
    else:
        intro = "**Tap the one that matches best.**"
    # Each button carries its own one-line description (option_hint), so the
    # message stays one line and nothing is hidden on a small screen.
    return reply.finish("clarification_needed", top, intro,
                        "picker", options, was_option, p_top)
