"""Nonsense filter: drop a first message that is not a real request.

Trained at startup, like the condition classifier, entirely from files in this
repo, so adding examples and retraining is: edit a CSV, restart the backend.

* Real requests = every example in data/master-training-examples.csv (all 14
  conditions and Out of scope) + the "real" rows of data/master-gate-examples.csv
  (vague but genuine messages like "grandpa looks really bad").
* Junk = the "junk" rows of data/master-gate-examples.csv: keyboard mash,
  greetings, "thank you", "test", speech-to-text noise like "[Music]".

A logistic regression over the same PubMed-BERT embeddings gives p(junk). A
message is dropped only when p(junk) >= CONFIG["GATE_JUNK_PROB"] (set high on
purpose: losing a real emergency costs far more than asking someone who typed
junk to try again), and never when it contains a word from
data/emergency-words.txt or a close misspelling of one ("sizure", "hel p").

Only the first message of a conversation is checked. Later messages answer our
own questions ("yes", "adult") and must never be dropped.

Set PRIMACURA_GATE_ENABLED=0 to switch it off.
"""
from __future__ import annotations

import csv
import difflib
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from pchCore import CONFIG

log = logging.getLogger("uvicorn.error")

DISCARD_REPLY = (
    "Sorry, I couldn't understand that. Please describe what is happening in a few words, for "
    "example: \"he collapsed and is not breathing\"."
)


def load_words(path: str | Path | None = None) -> tuple[str, ...]:
    path = Path(path or CONFIG["GATE_WORDS"])
    words = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip().lower()
        if line and not line.startswith("#"):
            words.append(line)
    return tuple(words)


def mentions_domain(text: str, terms: tuple[str, ...]) -> bool:
    """True if any word, or two adjacent words rejoined, is (nearly) an emergency word."""
    tokens = re.findall(r"[a-z0-9]+", str(text).lower())
    candidates = tokens + [a + b for a, b in zip(tokens, tokens[1:])]
    return any(
        tok in terms or (len(tok) >= 4 and difflib.get_close_matches(tok, terms, 1, 0.8))
        for tok in candidates
    )


def load_gate_examples(path: str | Path | None = None) -> tuple[list[str], list[str]]:
    """(real texts, junk texts) from data/master-gate-examples.csv."""
    real, junk = [], []
    with Path(path or CONFIG["GATE_CSV"]).open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            (junk if row["label"].strip().lower() == "junk" else real).append(row["text"])
    return real, junk


@dataclass(eq=False)
class NonsenseGate:
    model: Any          # the sentence-transformer, shared with the classifier
    clf: Any
    junk_index: int
    words: tuple[str, ...]
    junk_prob: float

    @classmethod
    def train(cls, model, training_csv=None, gate_csv=None, words_path=None, cache_dir=None) -> "NonsenseGate":
        import pandas as pd
        from sklearn.linear_model import LogisticRegression

        from pchTriage import _cached_embeddings

        classifier_texts = pd.read_csv(Path(training_csv or CONFIG["TRAINING_CSV"]))["text"].astype(str).tolist()
        extra_real, junk = load_gate_examples(gate_csv)
        texts = classifier_texts + extra_real + junk
        labels = np.array(["real"] * (len(classifier_texts) + len(extra_real)) + ["junk"] * len(junk))
        vectors = _cached_embeddings(model, texts, Path(cache_dir or CONFIG["CACHE_DIR"]))
        clf = LogisticRegression(C=CONFIG["GATE_C"], class_weight="balanced", max_iter=5000)
        clf.fit(vectors, labels)
        gate = cls(model, clf, list(clf.classes_).index("junk"), load_words(words_path), CONFIG["GATE_JUNK_PROB"])
        log.info("Nonsense gate trained on %d real and %d junk examples", len(labels) - len(junk), len(junk))
        return gate

    def p_junk(self, text: str) -> float:
        from pchTriage import _encode

        return float(self.clf.predict_proba(_encode(self.model, [text]))[0][self.junk_index])

    def keep(self, text: str) -> bool:
        if not str(text).strip():
            return False
        return mentions_domain(text, self.words) or self.p_junk(text) < self.junk_prob


def load_gate(model) -> NonsenseGate | None:
    """The trained gate, or None (gate off) when disabled or its files are missing or broken."""
    if os.getenv("PRIMACURA_GATE_ENABLED", "1") == "0":
        return None
    try:
        return NonsenseGate.train(model)
    except Exception as exc:  # noqa: BLE001 - a broken gate must never stop the app
        log.warning("Nonsense gate unavailable, all messages pass: %s", exc)
        return None
