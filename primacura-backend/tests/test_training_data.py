"""The training examples must never contain the test messages.

If a training example shares a 5-word run with (or normalises to the same text
as) a message or scripted reply in the master test set, the classifier would be
graded on sentences it learned from, and the scores would look better than they
are. Runs without the model:  python -m pytest tests/test_training_data.py
"""
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRAINING = ROOT / "data" / "master-training-examples.csv"
MASTER_TEST = ROOT / "tests" / "eval" / "master-test-set.csv"
CONDITIONS = {
    "Cardiac Arrest", "Cardiac Arrest (Drowning)", "Heart Attack", "Choking", "Anaphylaxis",
    "Diabetic Emergency", "Stroke", "Opioid Overdose", "Severe Bleeding", "Burns (Chemical to Eye)",
    "Burns (Thermal)", "Poisoning / Ingestion", "Seizures", "Head, Neck, or Spinal Injury", "Out of scope",
}


def _normalised(text):
    return " ".join(re.findall(r"[a-z0-9']+", text.lower()))


def _shingles(text, n=5):
    words = re.findall(r"[a-z']+", text.lower())
    return {" ".join(words[i:i + n]) for i in range(len(words) - n + 1)}


def _rows(path):
    with path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def test_no_training_example_overlaps_the_test_set():
    shingles, whole = set(), set()
    for r in _rows(MASTER_TEST):
        for t in [r["User_Query"]] + (r.get("Follow_Up_Replies") or "").split("||"):
            if t.strip():
                shingles |= _shingles(t)
                whole.add(_normalised(t))
    overlaps = [r["text"] for r in _rows(TRAINING)
                if _shingles(r["text"]) & shingles or _normalised(r["text"]) in whole]
    assert not overlaps, f"{len(overlaps)} training examples overlap the test set, e.g. {overlaps[:3]}"


def test_every_example_has_a_known_label_and_no_duplicates():
    rows = _rows(TRAINING)
    assert {r["condition"] for r in rows} <= CONDITIONS
    texts = [_normalised(r["text"]) for r in rows]
    assert len(texts) == len(set(texts))
