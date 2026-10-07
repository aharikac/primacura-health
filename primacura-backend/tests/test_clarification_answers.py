"""Typed answers to a clarifying question must never be decided by filler words.

Runs without the embedding model:  python -m pytest tests/test_clarification_answers.py
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pchCore  # noqa: E402
from pchCore import CLARIFICATION_PAIRS, resolve_clarification_answer  # noqa: E402

DROWN = ["Cardiac Arrest", "Cardiac Arrest (Drowning)"]

CASES = [
    # Filler words and non-answers must not select anything.
    ("please tell me what to do", DROWN, None),
    ("I don't know", DROWN, None),
    ("yes", DROWN, None),
    ("help please hurry", DROWN, None),
    # Exact labels (what a tapped button sends) always resolve.
    ("Cardiac Arrest", DROWN, "Cardiac Arrest"),
    ("cardiac arrest (drowning)", DROWN, "Cardiac Arrest (Drowning)"),
    # Real answers, including negation scoped to the clause.
    ("we pulled him from the pool", DROWN, "Cardiac Arrest (Drowning)"),
    ("he was swimming in the lake", DROWN, "Cardiac Arrest (Drowning)"),
    ("no, not in the water", DROWN, "Cardiac Arrest"),
    ("he just collapsed on the floor", DROWN, "Cardiac Arrest"),
    ("it wasn't water, he collapsed on the ground", DROWN, "Cardiac Arrest"),
    # Contradictory answers stay unresolved rather than guessed.
    ("he was in the pool but collapsed on the ground", DROWN, None),
]


@pytest.mark.parametrize("answer,options,expected", CASES)
def test_resolve(answer, options, expected):
    assert resolve_clarification_answer(answer, options) == expected


def test_option_order_does_not_matter():
    assert resolve_clarification_answer("by the pool", list(reversed(DROWN))) == "Cardiac Arrest (Drowning)"


def test_no_stopword_can_decide():
    """Every stopword, alone, must resolve to nothing for every question."""
    for pair in CLARIFICATION_PAIRS:
        options = sorted(pair)
        for word in pchCore._STOPWORDS:
            assert resolve_clarification_answer(word, options) is None, (word, options)


def test_unknown_pair_only_accepts_exact_labels():
    options = ["Severe Bleeding", "Opioid Overdose"]
    assert resolve_clarification_answer("bleeding a lot", options) is None
    assert resolve_clarification_answer("Severe Bleeding", options) == "Severe Bleeding"
