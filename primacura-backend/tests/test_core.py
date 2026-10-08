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


def test_how_to_markers_never_reach_the_protocol_text():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    assert not dataset["reformatted_output"].str.contains(r"\[(?:how-to|diagram|rhythm|facts)| \| ", regex=True).any()
    # Each marked step is mapped to its card, by the exact text the app receives.
    steps = [s.split(". ", 1)[1] for text in dataset["reformatted_output"] for s in text.split("\n") if ". " in s]
    linked = {pchCore.STEP_HOWTO[s] for s in steps if s in pchCore.STEP_HOWTO}
    assert {"cpr-adult", "cpr-infant", "aed", "tourniquet", "epipen", "naloxone"} <= linked


def test_every_how_to_link_has_a_card():
    import csv
    import re
    cards = {r["id"] for r in csv.DictReader((ROOT / "data" / "how-to-guides.csv").open(encoding="utf-8"))}
    links = set(re.findall(r"\[how-to:\s*([a-z0-9-]+)\]", (ROOT / "data" / "First_Aid_Dataset_Final.csv").read_text(encoding="utf-8")))
    assert links and links <= cards


def test_diagram_and_rhythm_markers_map_to_steps():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    steps = [s.split(". ", 1)[1] for text in dataset["reformatted_output"] for s in text.split("\n") if ". " in s]
    assert {"hand-position", "aed-pads-adult", "tourniquet-placement"} <= {pchCore.STEP_DIAGRAM[s] for s in steps if s in pchCore.STEP_DIAGRAM}
    assert sum(s in pchCore.STEP_RHYTHM for s in steps) >= 4
    diagrams = {p.stem for p in (ROOT / "data" / "diagrams").glob("*.svg")}
    assert set(pchCore.STEP_DIAGRAM.values()) <= diagrams


def test_every_step_has_a_short_action_it_starts_with():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    steps = [s.split(". ", 1)[1] for text in dataset["reformatted_output"] for s in text.split("\n") if ". " in s]
    for step in steps:
        action = pchCore.STEP_ACTION.get(step)
        assert action and step.startswith(action) and len(action) <= 90, step
    assert pchCore.STEP_FACTS  # fact pills were recorded
