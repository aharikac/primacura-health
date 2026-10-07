"""Core helpers: protocol loading/formatting and patient age handling.

    python -m pytest tests/test_core.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pchCore  # noqa: E402


def test_dataset_covers_every_condition():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    assert set(dataset["condition"]) == set(pchCore.KNOWN_CONDITIONS)


def test_only_cardiac_arrest_and_choking_depend_on_age():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    assert pchCore.age_sensitive_conditions(dataset) == {"Cardiac Arrest", "Choking"}


def test_format_protocol_keeps_steps_and_doses_intact():
    raw = "1. Check the scene. Then kneel down.\n2. Give 0.5 mg as directed.\n   - sub point"
    out = pchCore.format_protocol(raw)
    lines = out.split("\n")
    assert lines[0].startswith("1. Call 911")            # added: protocol never mentions 911
    assert lines[1] == "2. Check the scene. Then kneel down."  # one step, not split on ". "
    assert "0.5 mg" in out
    assert "- sub point" in lines[3] and lines[3].startswith("    ")  # folded into step 3


def test_detect_age_band():
    assert pchCore.detect_age_band("my 6 month old is not breathing") == "infant"
    assert pchCore.detect_age_band("my toddler is choking") == "child"
    assert pchCore.detect_age_band("my dad collapsed") == "adult"
    assert pchCore.detect_age_band("someone collapsed") is None


def test_age_buttons_map_to_bands():
    bands = [pchCore.detect_age_band(label) for label in pchCore.AGE_OPTIONS]
    assert bands == ["adult", "child", "infant"]
