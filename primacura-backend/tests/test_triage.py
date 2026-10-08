"""Triage-first engine (pchTriage), with a stub classifier. No model needed.

    python -m pytest tests/test_triage.py
"""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pchCore  # noqa: E402
import pchTriage as T  # noqa: E402


class StubClassifier:
    """Returns fixed probabilities, whatever the text."""

    def __init__(self, probs):
        self.classes = list(T.CONDITION_CUES) + [T.OUT_OF_SCOPE]
        base = {c: 0.001 for c in self.classes}
        base.update(probs)
        total = sum(base.values())
        self._p = {k: v / total for k, v in base.items()}

    def probabilities(self, text):
        return dict(self._p)


@pytest.fixture(scope="module")
def ds():
    dataset = pchCore.load_dataset(ROOT / "data" / "First_Aid_Dataset_Final.csv")
    return dataset, {c.strip() for c in pchCore.age_sensitive_conditions(dataset)}


def say(ds, text, probs, conv=None):
    dataset, age = ds
    conv = conv or pchCore.Conversation()
    return T.run_triage_agent(text, conv, dataset, StubClassifier(probs), age), conv


def test_unresponsive_and_not_breathing_goes_straight_to_cpr(ds):
    out, conv = say(ds, "My uncle collapsed and he's not breathing", {"Choking": 0.9})
    assert out["status"] == "success" and out["condition"] == "Cardiac Arrest"  # uncle -> adult, no age question


def test_water_gives_drowning_protocol(ds):
    out, _ = say(ds, "we pulled him out of the pool and he isn't breathing", {"Cardiac Arrest": 0.9})
    assert out["condition"] == "Cardiac Arrest (Drowning)"


def test_collapse_without_breathing_info_asks_triage_first(ds):
    out, conv = say(ds, "Someone collapsed.", {"Heart Attack": 0.9})
    assert out["status"] == "clarification_needed" and out["options"] == T.TRIAGE_OPTIONS


def test_triage_arrest_answer_then_age(ds):
    out, conv = say(ds, "Someone collapsed.", {"Heart Attack": 0.9})
    out, conv = say(ds, T.TRIAGE_ARREST, {"Heart Attack": 0.9}, conv)
    assert out["status"] == "age_clarification_needed" and out["condition"] == "Cardiac Arrest"
    out, conv = say(ds, "Infant (under 1 year)", {}, conv)
    assert out["status"] == "success" and "infant" in out["response"].lower()


def test_triage_awake_rules_out_arrest(ds):
    out, conv = say(ds, "My dad collapsed", {"Cardiac Arrest": 0.6, "Heart Attack": 0.4})
    out, conv = say(ds, T.TRIAGE_AWAKE, {"Cardiac Arrest": 0.6, "Heart Attack": 0.4}, conv)
    assert out["status"] == "success" and out["condition"] == "Heart Attack"


def test_conscious_gasping_is_not_treated_as_arrest(ds):
    out, _ = say(ds, "Someone took a pill and now their tongue is huge and they're gasping",
                 {"Anaphylaxis": 0.8})
    assert out["condition"] == "Anaphylaxis"


def test_seizure_activity_skips_triage(ds):
    out, _ = say(ds, "She collapsed and is shaking all over", {"Seizures": 0.9})
    assert out["status"] == "success" and out["condition"] == "Seizures"


def test_unresponsive_breathing_never_gets_conscious_choking(ds):
    out, conv = say(ds, "He passed out", {"Choking": 0.7, "Opioid Overdose": 0.3})
    out, conv = say(ds, T.TRIAGE_UNRESPONSIVE_BREATHING, {"Choking": 0.7, "Opioid Overdose": 0.3}, conv)
    assert out["condition"] == "Opioid Overdose"


def test_low_confidence_offers_top_two_plus_none(ds):
    probs = {"Stroke": 0.35, "Diabetic Emergency": 0.3, "Seizures": 0.2}
    out, conv = say(ds, "my grandpa is acting strange", probs)
    assert out["status"] == "clarification_needed"
    assert out["options"] == ["Stroke", "Diabetic Emergency", T.NONE_OPTION]  # PICKER_SIZE = 2


def test_tapping_an_option_commits_it(ds):
    probs = {"Stroke": 0.35, "Diabetic Emergency": 0.3, "Seizures": 0.2}
    out, conv = say(ds, "my grandpa is acting strange", probs)
    out, conv = say(ds, "Diabetic Emergency", probs, conv)
    assert out["status"] == "success" and out["condition"] == "Diabetic Emergency"


def test_none_of_these_asks_for_description_then_excludes_offered(ds):
    probs = {"Stroke": 0.35, "Diabetic Emergency": 0.3, "Seizures": 0.2, "Poisoning / Ingestion": 0.1}
    out, conv = say(ds, "my grandpa is acting strange", probs)
    out, conv = say(ds, T.NONE_OPTION, probs, conv)
    assert out["status"] == "clarification_needed" and not out["options"]
    out, conv = say(ds, "he drank something from the garage", probs, conv)
    assert "Stroke" not in out["options"] and "Poisoning / Ingestion" in out["options"]


def test_filler_words_never_select_an_option(ds):
    probs = {"Stroke": 0.35, "Head, Neck, or Spinal Injury": 0.3, "Burns (Chemical to Eye)": 0.2}
    out, conv = say(ds, "something is wrong", probs)
    out, conv = say(ds, "please tell me what to do or something", probs, conv)
    assert out["status"] != "success"


def test_out_of_scope_shows_no_protocol(ds):
    out, _ = say(ds, "What should be in a first aid kit?", {T.OUT_OF_SCOPE: 0.9})
    assert out["status"] != "success" and T.NONE_OPTION in out["options"]


def test_confident_age_sensitive_match_asks_age_with_buttons(ds):
    out, _ = say(ds, "someone is choking on food", {"Choking": 0.9})
    assert out["status"] == "age_clarification_needed" and out["options"] == pchCore.AGE_OPTIONS


# --------------------------------------------------------------------------
# LLM second opinion (only consulted when the classifier is unsure)
# --------------------------------------------------------------------------
class StubLLM:
    def __init__(self, label):
        self.label, self.calls = label, 0

    def classify(self, text):
        from pchLLM import LLMResult
        self.calls += 1
        return LLMResult(self.label, 5)


UNSURE_PROBS = {"Stroke": 0.35, "Diabetic Emergency": 0.3, "Seizures": 0.2, "Poisoning / Ingestion": 0.1}


def say_llm(ds, text, probs, llm, conv=None):
    dataset, age = ds
    conv = conv or pchCore.Conversation()
    return T.run_triage_agent(text, conv, dataset, StubClassifier(probs), age, llm=llm), conv


def test_llm_not_called_when_classifier_is_confident(ds):
    llm = StubLLM("Stroke")
    say_llm(ds, "his face is drooping", {"Stroke": 0.9}, llm)
    assert llm.calls == 0


def test_llm_agreeing_with_the_top_guess_shows_protocol(ds):
    out, _ = say_llm(ds, "grandpa is acting strange", UNSURE_PROBS, StubLLM("Stroke"))
    assert out["status"] == "success" and out["condition"] == "Stroke"


def test_llm_picking_the_second_guess_still_asks(ds):
    # The LLM must agree with the classifier's top guess before a protocol is shown.
    out, _ = say_llm(ds, "grandpa is acting strange", UNSURE_PROBS, StubLLM("Diabetic Emergency"))
    assert out["status"] == "clarification_needed" and "Diabetic Emergency" in out["options"]


def test_llm_outside_top_candidates_goes_first_in_the_list(ds):
    out, _ = say_llm(ds, "grandpa is acting strange", UNSURE_PROBS, StubLLM("Poisoning / Ingestion"))
    assert out["status"] == "clarification_needed"
    assert out["options"][0] == "Poisoning / Ingestion" and out["options"][-1] == T.NONE_OPTION


def test_llm_unsure_or_down_falls_back_to_the_list(ds):
    for label in ("Unsure", None):
        out, _ = say_llm(ds, "grandpa is acting strange", UNSURE_PROBS, StubLLM(label))
        assert out["status"] == "clarification_needed"
        assert out["options"] == ["Stroke", "Diabetic Emergency", T.NONE_OPTION]  # PICKER_SIZE = 2


def test_llm_cannot_override_the_safety_answer(ds):
    probs = {"Cardiac Arrest": 0.4, "Heart Attack": 0.35, "Stroke": 0.25}
    out, conv = say_llm(ds, "My dad collapsed", probs, StubLLM("Cardiac Arrest"))
    out, conv = say_llm(ds, T.TRIAGE_AWAKE, probs, StubLLM("Cardiac Arrest"), conv)
    assert out["condition"] != "Cardiac Arrest"


# --- nonsense gate (pchGate) -------------------------------------------------

class StubGate:
    """Rejects exactly the texts it is given."""

    def __init__(self, junk):
        self.junk = set(junk)
        self.seen = []

    def keep(self, text):
        self.seen.append(text)
        return text not in self.junk


def say_gated(ds, text, probs, gate, conv=None):
    dataset, age = ds
    conv = conv or pchCore.Conversation()
    return T.run_triage_agent(text, conv, dataset, StubClassifier(probs), age, gate=gate), conv


def test_gate_drops_junk_first_message_without_recording_it(ds):
    gate = StubGate({"asdf qwer"})
    out, conv = say_gated(ds, "asdf qwer", {"Choking": 0.9}, gate)
    assert out["status"] == "clarification_needed" and out["options"] == [] and out.get("discarded")
    assert conv.turns == []
    out, conv = say_gated(ds, "he is choking on food", {"Choking": 0.9}, gate, conv)
    assert out["status"] == "age_clarification_needed"


def test_gate_never_checks_answers_to_our_questions(ds):
    gate = StubGate({"Adult"})
    out, conv = say_gated(ds, "he is choking on food", {"Choking": 0.9}, gate)
    out, conv = say_gated(ds, "Adult", {"Choking": 0.9}, gate, conv)
    assert out["status"] == "success" and gate.seen == ["he is choking on food"]


def test_drowned_counts_as_water(ds):
    out, _ = say(ds, "drowned no pulse what do i do", {"Cardiac Arrest": 0.9})
    assert out["condition"] == "Cardiac Arrest (Drowning)"


def test_no_water_word_never_gives_drowning_steps_directly(ds):
    """Water-word rule: a classifier lean towards drowning only earns a question."""
    out, conv = say(ds, "My son fell off the swing onto the grass and isn't breathing or responding",
                    {"Cardiac Arrest (Drowning)": 0.8, "Cardiac Arrest": 0.1})
    assert out["status"] == "clarification_needed"
    assert set(out["options"]) == {"Cardiac Arrest", "Cardiac Arrest (Drowning)"}
    out, conv = say(ds, "no, not in the water", {"Cardiac Arrest (Drowning)": 0.8, "Cardiac Arrest": 0.1}, conv)
    assert out["condition"] == "Cardiac Arrest"


# --- negation, animals, LLM tie-break (2026-10-06) ------------------------------

def test_negated_condition_is_hidden_from_the_classifier():
    assert "diabet" not in T.strip_negated("He doesn't have diabetes; he just dropped and started convulsing.")
    assert T.strip_negated("he can't swallow and his lips are swelling") == "he can't swallow and his lips are swelling"
    assert "isn't breathing" in T.strip_negated("He wasn't in the water and isn't breathing")


def test_animal_patient_gets_the_vet_reply(ds):
    out, conv = say(ds, "My dog ate chocolate.", {"Poisoning / Ingestion": 0.9})
    assert out["status"] == "clarification_needed" and "vet" in out["response"] and out["options"] == []
    out, _ = say(ds, "a dog bit my daughter and it's bleeding a lot", {"Severe Bleeding": 0.9})
    assert out["status"] == "success"
    # The rider is the patient, and a question about humans is about a person.
    assert not T.is_animal_only("fell off horse landed on neck hurts to move")
    assert not T.is_animal_only("got bucked off my horse and my back hurts")
    assert not T.is_animal_only("dog ate rat poison by mistake what about humans")
    assert T.is_animal_only("my horse is limping badly")


class FixedLLM:
    def __init__(self, label):
        self.label = label

    def classify(self, text):
        from pchLLM import LLMResult
        return LLMResult(self.label, 5)


def say_fixed_llm(ds, text, probs, label):
    dataset, age = ds
    conv = pchCore.Conversation()
    return T.run_triage_agent(text, conv, dataset, StubClassifier(probs), age, llm=FixedLLM(label))


def test_tie_break_band_needs_llm_agreement(ds):
    probs = {"Stroke": 0.55, "Heart Attack": 0.35}
    out = say_fixed_llm(ds, "chest pain and his arm is numb", probs, "Heart Attack")
    assert out["status"] == "clarification_needed" and out["options"][0] == "Heart Attack"
    out = say_fixed_llm(ds, "chest pain and his arm is numb", probs, "Stroke")
    assert out["status"] == "success" and out["condition"] == "Stroke"


def test_without_llm_answer_the_old_threshold_applies(ds):
    out = say_fixed_llm(ds, "chest pain and his arm is numb", {"Stroke": 0.55, "Heart Attack": 0.35}, None)
    assert out["status"] == "success"


# --- replies that add nothing, sticky LLM disagreement, age words (2026-10-06) ---

def test_age_only_reply_to_the_option_list_asks_again(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    out = T.run_triage_agent("ate peanuts, face swelling, can't breathe", conv, dataset,
                             StubClassifier(probs), age, llm=FixedLLM("Anaphylaxis"))
    assert out["status"] == "clarification_needed" and out["options"][0] == "Anaphylaxis"
    out = T.run_triage_agent("adult", conv, dataset, StubClassifier({"Choking": 0.95}), age, llm=FixedLLM("Anaphylaxis"))
    assert out["status"] == "clarification_needed" and out["options"][0] == "Anaphylaxis"
    assert conv.age_band == "adult"
    out = T.run_triage_agent("Anaphylaxis", conv, dataset, StubClassifier({"Choking": 0.95}), age)
    assert out["status"] == "success" and out["condition"] == "Anaphylaxis"


def test_llm_disagreement_sticks_for_the_conversation(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    T.run_triage_agent("lips swelling after shrimp", conv, dataset,
                       StubClassifier({"Poisoning / Ingestion": 0.55, "Anaphylaxis": 0.35}), age,
                       llm=FixedLLM("Anaphylaxis"))
    assert conv.llm_disagreed
    out = T.run_triage_agent("and she is vomiting now", conv, dataset,
                             StubClassifier({"Poisoning / Ingestion": 0.9}), age, llm=FixedLLM("Anaphylaxis"))
    assert out["status"] == "clarification_needed"


def test_age_only_replies_are_never_classifier_input(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    T.run_triage_agent("ate peanuts, face swelling", conv, dataset, StubClassifier(probs), age,
                       llm=FixedLLM("Anaphylaxis"))
    T.run_triage_agent("adult", conv, dataset, StubClassifier(probs), age, llm=FixedLLM("Anaphylaxis"))
    assert "adult" not in T._described_text(conv, "and hives", False)


def test_uninformative_replies():
    assert T.is_uninformative("she's an adult") and T.is_uninformative("yes") and T.is_uninformative("6 years old")
    assert not T.is_uninformative("she is choking on food")


def test_every_option_gets_a_hint_line():
    assert T.option_hint("Anaphylaxis").startswith("Allergic reaction")
    assert T.option_hint(T.NONE_OPTION) == "Describe what you see instead"
    assert T.option_hint("Adult") == ""


# --- going back from the steps to the question (2026-10-06) ---------------------

def test_back_from_steps_then_tap_another_option(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    out = T.run_triage_agent("ate peanuts, face swelling", conv, dataset, StubClassifier(probs), age,
                             llm=FixedLLM("Anaphylaxis"))
    assert out["options"][:2] == ["Anaphylaxis", "Choking"]
    out = T.run_triage_agent("Anaphylaxis", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "success" and out["condition"] == "Anaphylaxis"
    # Back in the app, then the other button.
    out = T.run_triage_agent("Choking", conv, dataset, StubClassifier({"Stroke": 0.95}), age)
    assert out["condition"] == "Choking"
    assert out["status"] in ("success", "age_clarification_needed")


def test_back_from_steps_then_tap_another_age(ds):
    out, conv = say(ds, "he is choking on food", {"Choking": 0.9})
    assert out["status"] == "age_clarification_needed"
    out, conv = say(ds, "Adult", {"Choking": 0.9}, conv)
    assert out["status"] == "success"
    out, conv = say(ds, "Infant (under 1 year)", {"Stroke": 0.95}, conv)
    assert out["status"] == "success" and out["condition"] == "Choking" and conv.age_band == "infant"


def test_back_from_age_question_then_tap_another_condition(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    T.run_triage_agent("ate peanuts, face swelling", conv, dataset, StubClassifier(probs), age,
                       llm=FixedLLM("Anaphylaxis"))
    out = T.run_triage_agent("Choking", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "age_clarification_needed"
    # Back to the condition options, then the other condition: not the Choking steps.
    out = T.run_triage_agent("Anaphylaxis", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "success" and out["condition"] == "Anaphylaxis"


def test_returning_to_a_condition_asks_the_age_again(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    T.run_triage_agent("ate peanuts, face swelling", conv, dataset, StubClassifier(probs), age,
                       llm=FixedLLM("Anaphylaxis"))
    T.run_triage_agent("Choking", conv, dataset, StubClassifier(probs), age)
    out = T.run_triage_agent("Child (1 year to puberty)", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "success"
    T.run_triage_agent("Anaphylaxis", conv, dataset, StubClassifier(probs), age)
    out = T.run_triage_agent("Choking", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "age_clarification_needed"
    out = T.run_triage_agent("Adult", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "success" and conv.age_band == "adult"


def test_age_from_their_own_words_is_not_asked_again(ds):
    dataset, age = ds
    conv = pchCore.Conversation()
    probs = {"Choking": 0.55, "Anaphylaxis": 0.35}
    T.run_triage_agent("my 6 month old ate peanuts and is swelling", conv, dataset, StubClassifier(probs), age,
                       llm=FixedLLM("Anaphylaxis"))
    T.run_triage_agent("Anaphylaxis", conv, dataset, StubClassifier(probs), age)
    out = T.run_triage_agent("Choking", conv, dataset, StubClassifier(probs), age)
    assert out["status"] == "success" and conv.age_band == "infant"


def test_embedding_cache_keeps_only_the_newest_files(tmp_path):
    import os, time
    for i in range(7):
        f = tmp_path / f"training_embeddings_{i}.npy"
        f.write_text("x")
        os.utime(f, (time.time() - 100 + i,) * 2)
    T._touch(tmp_path / "training_embeddings_0.npy")  # the oldest is still in use
    T._prune_cache(tmp_path, 4)
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        f"training_embeddings_{i}.npy" for i in (0, 4, 5, 6)]
