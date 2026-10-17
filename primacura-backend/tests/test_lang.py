"""Spanish support (pchLang): the Spanish guides line up with the English ones,
every reply the backend can send has Spanish text, and Spanish is recognised."""
import re

import pandas as pd

import pchCore
import pchLang
import pchTriage

DATA = pchCore.REPO_ROOT / "data"
_MARK = re.compile(r"\[(?:how-to|diagram):[^\]]+\]|\[rhythm\]")


def test_spanish_guides_match_english_rows_steps_and_marks():
    en = pd.read_csv(DATA / "First_Aid_Dataset_Final.csv")
    es = pd.read_csv(DATA / "First_Aid_Dataset_Final.es.csv")
    assert list(es["guide_id"]) == list(en["guide_title"])
    for (_, e), (_, s) in zip(en.iterrows(), es.iterrows()):
        assert len(re.findall(r"^\s*\d+\.", e.output, re.M)) == len(re.findall(r"^\s*\d+\.", s.output, re.M)), s.guide_id
        assert _MARK.findall(e.output) == _MARK.findall(s.output), s.guide_id
        assert e.output.count("[facts:") == s.output.count("[facts:"), s.guide_id


def test_spanish_how_to_cards_match_english():
    en = pd.read_csv(DATA / "how-to-guides.csv", keep_default_na=False)
    es = pd.read_csv(DATA / "how-to-guides.es.csv", keep_default_na=False)
    assert list(es["id"]) == list(en["id"])
    for col in ("age", "group", "ask_age", "diagrams", "rhythm"):
        assert list(es[col]) == list(en[col]), col


def test_every_protocol_has_a_spanish_version():
    dataset = pchCore.load_dataset()
    guides = pchLang.SpanishGuides(dataset)
    for steps in dataset["reformatted_output"]:
        title, response = guides.protocol(f"{pchCore.SAFETY_STEP}\n{steps}")
        assert title and response.startswith(pchCore.SAFETY_STEP_ES)


def test_every_option_and_condition_has_spanish_labels():
    labels = set(pchTriage.CONDITION_CUES) | set(pchTriage.TRIAGE_OPTIONS) | set(pchCore.AGE_OPTIONS) | {pchTriage.NONE_OPTION}
    assert labels <= set(pchLang.OPTION_ES)
    assert set(pchTriage.CONDITION_CUES) <= set(pchLang.HINT_ES)


def test_fixed_messages_have_spanish_text():
    from pchGate import DISCARD_REPLY
    for message in (pchTriage.PET_REPLY, DISCARD_REPLY):
        assert pchLang.message_es(message) != message
    age_question = ("This looks like **Choking**, but the correct steps depend on the patient's age and they "
                    "are not interchangeable.\n\n**Is this an adult, a child (1 year to puberty), or an infant (under 1 year)?**")
    assert "Atragantamiento" in pchLang.message_es(age_question)


def test_language_detection():
    for text in ["mi esposo no respira", "se cayó y se golpeó la cabeza", "ayuda", "¿qué hago? mi bebé se ahoga"]:
        assert pchLang.looks_spanish(text), text
    for text in ["my son fell and hit his head", "help my dad is choking", "Adult"]:
        assert not pchLang.looks_spanish(text), text
    assert pchLang.has_spanish("my wife no respira")


def test_spanish_ages_survive_translation():
    import pchCore
    for original, english, band in [("tiene un mes", "has one month", "infant"),
                                     ("tiene 9 meses", "has 9 months", "infant"),
                                     ("de 10 días", "of 10 days", "infant"),
                                     ("tiene 2 años", "has 2 years", "child"),
                                     ("como 6 años", "about 6 years", "child")]:
        assert pchCore.detect_age_band(pchLang.with_age(original, english)) == band, original


# ---------------------------------------------------------------- Chinese ----
def test_chinese_guides_match_english_rows_steps_and_marks():
    en = pd.read_csv(DATA / "First_Aid_Dataset_Final.csv")
    for lang in ("zh-Hans", "zh-Hant"):
        zh = pd.read_csv(DATA / f"First_Aid_Dataset_Final.{lang}.csv")
        assert list(zh["guide_id"]) == list(en["guide_title"]), lang
        for (_, e), (_, s) in zip(en.iterrows(), zh.iterrows()):
            assert len(re.findall(r"^\s*\d+\.", e.output, re.M)) == len(re.findall(r"^\s*\d+\.", s.output, re.M)), s.guide_id
            assert _MARK.findall(e.output) == _MARK.findall(s.output), s.guide_id
            assert e.output.count("[facts:") == s.output.count("[facts:"), s.guide_id
        cards = pd.read_csv(DATA / f"how-to-guides.{lang}.csv", keep_default_na=False)
        assert list(cards["id"]) == list(pd.read_csv(DATA / "how-to-guides.csv", keep_default_na=False)["id"])


def test_every_language_has_every_reply():
    dataset = pchCore.load_dataset()
    labels = set(pchTriage.CONDITION_CUES) | set(pchTriage.TRIAGE_OPTIONS) | set(pchCore.AGE_OPTIONS) | {pchTriage.NONE_OPTION}
    from pchGate import DISCARD_REPLY
    for lang in pchLang.LANGS:
        r = pchLang.REPLIES[lang]
        assert labels <= set(r["option"]), lang
        assert set(pchTriage.CONDITION_CUES) <= set(r["hint"]), lang
        for message in (pchTriage.PET_REPLY, DISCARD_REPLY):
            assert pchLang.message_in(lang, message) != message, lang
        guides = pchLang.Guides(dataset, lang)
        for steps in dataset["reformatted_output"]:
            assert guides.protocol(f"{pchCore.SAFETY_STEP}\n{steps}"), lang
    # The Chinese tables are matched to the English messages by position: check the pairing.
    assert pchLang._MESSAGE_KEYS["pet"] == pchTriage.PET_REPLY
    assert pchLang._MESSAGE_KEYS["discard"] == DISCARD_REPLY
    assert pchLang._MESSAGE_KEYS["tap"] == "**Tap the one that matches best.**"


def test_chinese_detection_script_and_ages():
    for text, lang in [("我老公冇反應，唔識郁", "zh-Hant"), ("我的宝宝噎住了，不能呼吸", "zh-Hans"),
                       ("我爸爸暈倒了，沒有呼吸", "zh-Hant"), ("BB唔呼吸", "zh-Hant")]:
        assert pchLang.detect(text) == (lang, True), text
    assert pchLang.detect("我爸爸心口痛", "zh-Hant") == ("zh-Hant", True)  # characters both scripts share
    assert pchLang.detect("my dad is choking") == ("en", False)
    for original, band in [("3个月大", "infant"), ("兩歲", "child"), ("十天", "infant"), ("一岁半", "child")]:
        assert pchCore.detect_age_band(pchLang.with_age(original, "is")) == band, original
