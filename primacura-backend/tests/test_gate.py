"""Nonsense filter pieces that run without the embedding model."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pchGate  # noqa: E402

TERMS = pchGate.load_words(ROOT / "data" / "emergency-words.txt")


def test_emergency_words_rescue_typos_and_split_words():
    assert pchGate.mentions_domain("hes having a sizure", TERMS)
    assert pchGate.mentions_domain("hel p", TERMS)
    assert pchGate.mentions_domain("not BREATHING", TERMS)


def test_emergency_words_do_not_match_junk():
    assert not pchGate.mentions_domain("asdfgh qwerty", TERMS)
    assert not pchGate.mentions_domain("thank you", TERMS)


def test_technique_names_and_drug_slang_are_never_junk():
    for text in ["how to make a makeshift tourniquet", "heimlich", "defibrillator",
                 "how many percs is too many", "he took oxys", "she did fent"]:
        assert pchGate.mentions_domain(text, TERMS), text


def test_gate_examples_file_is_well_formed():
    real, junk = pchGate.load_gate_examples(ROOT / "data" / "master-gate-examples.csv")
    assert len(junk) >= 100 and len(real) >= 50
    assert not set(real) & set(junk)
