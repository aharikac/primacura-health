"""Spanish support: read Spanish messages, answer in Spanish.

The classifier, the safety rules and the LLM second opinion all work on English.
A message written in Spanish is translated to English first (the local LLM, with
a small glossary as the fallback when the LLM is down); the decision is made
exactly as for English; and the reply is then put back into Spanish:

  * every message the backend can send (questions, picker intro, pet reply...)
  * option labels and hints (the option VALUES stay English: the apps send the
    value back, so taps work the same in both languages)
  * the guide itself, from data/First_Aid_Dataset_Final.es.csv (same rows, steps
    and [marks] as the English CSV; guide_id = the English guide_title)

Spanish medical wording should be reviewed by a native speaker before release.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
import unicodedata
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path

import pandas as pd

import pchCore
from pchCore import AGE_OPTIONS, CLARIFICATION_PAIRS, SAFETY_STEP, SAFETY_STEP_ES, format_protocol, strip_howto

log = logging.getLogger(__name__)

ES_CSV = pchCore.REPO_ROOT / "data" / "First_Aid_Dataset_Final.es.csv"

# --------------------------------------------------------------------------
# Is this message Spanish?
# --------------------------------------------------------------------------
# Words that are clearly Spanish or clearly English (ambiguous ones such as
# "a", "no", "me", "con" are left out of both lists).
_ES_WORDS = frozenset("""
el la los las un una unos unas del al que y en se por para es está esta están estan estaba son fue
mi mis su sus le les lo ella él pero muy tiene tengo tenía tenia hay ya después despues porque cuando
donde dónde qué cómo como yo nos usted ustedes este esto eso esa ese también tambien
hijo hija hijos niño nino niña nina niños bebé bebe mamá mama papá papa esposo esposa marido mujer
hombre abuelo abuela abuelita amigo amiga hermano hermana señor señora vecino persona alguien
ayuda ayúdame ayudame auxilio socorro urgente rápido rapido favor
respira respirar respirando cayó cayo caído caido desmayó desmayo desmayado desmayada inconsciente
sangre sangrando sangra herida corte cortó quemó quemo quemadura quemado fuego agua piscina alberca
pecho dolor duele cabeza cuello espalda brazo pierna mano ojo ojos cara boca garganta lengua labios
atragantado atragantada ahogando ahogó ahogo ahogado convulsión convulsiones convulsionando temblando
alergia alérgico alergico picadura abeja hinchado hinchada ronchas tragó trago pastillas veneno
azúcar azucar diabético diabetico diabética insulina sobredosis droga drogas morado morada pálido
adulto adulta
""".split())
_EN_WORDS = frozenset("""
the an is are was were my his her he she it its of to in not has have had with on for i i'm can't won't
isn't doesn't don't didn't and or but they their them this that what help please breathing breathe
fell fall bleeding blood burn burned choking chest pain hurts hurt baby child kid son daughter wife husband
mom dad friend man woman just now there here
""".split())
_ES_CHARS = re.compile(r"[ñ¿¡]", re.I)
_ACCENTS = re.compile(r"[áéíóúü]", re.I)
_WORD = re.compile(r"[a-záéíóúüñ']+", re.I)


def looks_spanish(text: str) -> bool:
    words = [w.lower() for w in _WORD.findall(str(text))]
    es = sum(w in _ES_WORDS for w in words)
    en = sum(w in _EN_WORDS for w in words)
    if _ES_CHARS.search(text) and es >= en:
        return True
    if es >= 1 and en == 0:
        return True
    return es >= 2 and es > en * 1.5


# Short or common words that also turn up in English messages ("my son", "mama",
# "papa", "como"...): never enough on their own to translate an English message.
_SHARED = frozenset("""
el la los las un una unos unas del al que y en se por para es son con mi mis su sus le les lo yo nos
ya hay como este esto eso esa ese mama papa persona mujer favor rapido urgente amigo amiga
""".split())


def has_spanish(text: str) -> bool:
    """A clearly Spanish word, also in mixed messages like "my wife no respira"."""
    return bool(_ES_CHARS.search(text)) or any(
        w.lower() in _ES_WORDS and w.lower() not in _SHARED for w in _WORD.findall(str(text)))


def looks_english(text: str) -> bool:
    words = [w.lower() for w in _WORD.findall(str(text))]
    return sum(w in _EN_WORDS for w in words) >= 1 and not looks_spanish(text)


# --------------------------------------------------------------------------
# Spanish -> English
# --------------------------------------------------------------------------
_TRANSLATE_PROMPT = (
    "You translate messages typed into a first-aid app from Spanish (or a mix of Spanish and English) "
    "into English. Translate faithfully and literally: keep every detail, including who it is, ages, "
    "numbers, drug and product names, and words like 'not'. Do not add, explain, answer or give advice. "
    "Emergency words: 'ahogar(se)' / 'se está ahogando' / 'atragantado' = choking (cannot breathe), unless the "
    "person was in water (agua, piscina, alberca, pileta, río, mar, playa), then it is drowning; 'morado/morada', "
    "'se puso azul' = turned blue; 'no respira' = is not breathing; 'no responde', 'no reacciona', 'no despierta', "
    "'inconsciente' = not responding / unconscious; 'se desmayó', 'se desvaneció' = fainted; 'se desplomó' = "
    "collapsed; 'convulsionando', 'ojos en blanco' = having a seizure, eyes rolled back; 'cara caída', 'boca "
    "torcida' = face drooping; 'habla arrastrado' = slurred speech; 'picadura', 'le picó' = sting; 'ronchas' = "
    "hives; 'se le cierra la garganta' = throat closing; 'se le bajó el azúcar' = low blood sugar; 'sangra a "
    "chorros', 'se está desangrando' = bleeding heavily; 'cloro', 'lejía' = bleach; 'cal' = lime (caustic); "
    "'se tomó', 'se tragó' = swallowed; 'se pegó en la cabeza' = hit their head; 'nene/nena', 'beba' = little "
    "child / baby girl; 'compa' = friend; 'casi no respira' = barely breathing; 'tiritones', 'temblores' = "
    "shaking/jerking; 'pone los ojos en blanco', 'ojos blancos' = eyes roll back; 'le cayó agua/aceite hirviendo' "
    "= boiling water/oil spilled on them (a burn). Ages: 'tiene 7 días', 'de 7 días' = is 7 days old; 'tiene un "
    "mes', 'de un mes' = is one month old; 'tiene 9 meses', 'de 9 meses' = is 9 months old; 'tiene 2 años', 'de "
    "2 años' = is 2 years old. "
    'Reply only with JSON: {"english": "<the translation>"}.'
)
# Structured output: Qwen3 otherwise sometimes writes out its reasoning even
# with thinking switched off, and that text must never reach the classifier.
_SCHEMA = {"type": "object", "properties": {"english": {"type": "string"}}, "required": ["english"]}

# Fallback when the LLM is unavailable: longest phrases first.
_GLOSSARY = [
    ("no responde", "is not responding"), ("no respira", "is not breathing"), ("no puede respirar", "can't breathe"),
    ("le cuesta respirar", "has trouble breathing"), ("respira", "is breathing"), ("se desmayó", "fainted"),
    ("se cayó", "fell"), ("se golpeó la cabeza", "hit his head"), ("se está ahogando", "is choking"),
    ("se ahogó", "drowned"), ("se atragantó", "choked"), ("atragantado", "choking"), ("atragantada", "choking"),
    ("dolor de pecho", "chest pain"), ("dolor en el pecho", "chest pain"), ("le duele el pecho", "has chest pain"),
    ("está sangrando", "is bleeding"), ("sangra mucho", "is bleeding heavily"), ("mucha sangre", "a lot of blood"),
    ("sangrando", "bleeding"), ("sangre", "blood"), ("herida", "wound"), ("cuchillo", "knife"), ("apuñalado", "stabbed"),
    ("convulsionando", "having a seizure"), ("convulsión", "seizure"), ("convulsiones", "seizures"),
    ("temblando", "shaking"), ("reacción alérgica", "allergic reaction"), ("alérgico", "allergic"),
    ("alergia", "allergy"), ("picadura de abeja", "bee sting"), ("cacahuate", "peanut"), ("maní", "peanut"),
    ("garganta", "throat"), ("hinchada", "swollen"), ("hinchado", "swollen"), ("ronchas", "hives"),
    ("quemadura", "burn"), ("se quemó", "burned himself"), ("agua hirviendo", "boiling water"), ("fuego", "fire"),
    ("cloro", "bleach"), ("en el ojo", "in the eye"), ("en los ojos", "in the eyes"), ("tragó", "swallowed"),
    ("pastillas", "pills"), ("veneno", "poison"), ("sobredosis", "overdose"), ("labios morados", "blue lips"),
    ("azúcar baja", "low blood sugar"), ("diabético", "diabetic"), ("diabética", "diabetic"), ("insulina", "insulin"),
    ("cara caída", "face drooping"), ("no puede hablar", "can't speak"), ("habla arrastrando", "slurred speech"),
    ("un lado", "one side"), ("piscina", "pool"), ("alberca", "pool"), ("agua", "water"),
    ("cuello", "neck"), ("espalda", "back"), ("cabeza", "head"), ("accidente de carro", "car crash"),
    ("inconsciente", "unconscious"), ("mi bebé", "my baby"), ("bebé", "baby"), ("mi hijo", "my son"),
    ("mi hija", "my daughter"), ("niño", "child"), ("niña", "child"), ("adulto", "adult"), ("mi esposo", "my husband"),
    ("mi esposa", "my wife"), ("mi mamá", "my mom"), ("mi papá", "my dad"), ("mi abuelo", "my grandfather"),
    ("mi abuela", "my grandmother"), ("años", "years old"), ("meses", "months old"), ("ayuda", "help"),
    ("abeja", "bee"), ("le picó", "got stung by"), ("se le hincha", "is swelling"), ("se hincha", "is swelling"),
    ("uva", "grape"), ("comida", "food"), ("suda", "is sweating"), ("sudando", "sweating"), ("vomitando", "vomiting"),
    ("tiene", "has"), ("está", "is"), ("no puede", "can't"), ("mucho", "a lot"), ("muy", "very"),
    ("y", "and"), ("con", "with"), ("una", "a"), ("un", "a"), ("el", "the"), ("la", "the"), ("los", "the"),
    ("las", "the"), ("de", "of"), ("en", "in"), ("se", ""), ("le", ""), ("mi", "my"), ("su", "his"),
]


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def glossary_translate(text: str) -> str:
    out = " " + _strip_accents(str(text).lower()) + " "
    for es, en in sorted(_GLOSSARY, key=lambda p: -len(p[0])):
        out = re.sub(rf"(?<![\w]){re.escape(_strip_accents(es))}(?![\w])", en, out)
    return re.sub(r"\s+", " ", out).strip()


_ES_NUMBERS = {"un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7,
               "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12, "catorce": 14, "quince": 15}
_ES_UNITS = {"dia": "day", "semana": "week", "mes": "month", "ano": "year"}
_ES_AGE = re.compile(r"\b(?:tiene|de|con|cumplio|cumple|como|unos|unas|casi)\s+(\d{1,3}|" + "|".join(_ES_NUMBERS) +
                     r")\s+(dias?|semanas?|mes(?:es)?|anos?)\b")


def spanish_age(text: str) -> str | None:
    """'tiene 9 meses' / 'de 10 días' -> '9 months old' / '10 days old' (None if no age)."""
    m = _ES_AGE.search(_strip_accents(str(text).lower()))
    if not m:
        return None
    n = int(m.group(1)) if m.group(1).isdigit() else _ES_NUMBERS[m.group(1)]
    unit = _ES_UNITS[next(k for k in _ES_UNITS if m.group(2).startswith(k))]
    return f"{n} {unit}{'s' if n != 1 else ''} old"


def with_age(original: str, english: str) -> str:
    """Make sure an age stated in Spanish survives translation in a form the age check reads
    (the model tends to write "has 9 months" for a short reply like "tiene 9 meses")."""
    age = spanish_age(original)
    if age and pchCore.detect_age_band(english) is None:
        return f"{english} ({age})"
    return english


class Translator:
    """Spanish -> English with the same local Ollama model as the LLM second opinion."""

    def __init__(self, url: str | None = None, model: str | None = None, timeout: float | None = None,
                 use_llm: bool = True):
        self.use_llm = use_llm
        self.url = (url or os.getenv("PRIMACURA_LLM_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.getenv("PRIMACURA_LLM_MODEL", "qwen3:4b")
        self.timeout = float(timeout or os.getenv("PRIMACURA_TRANSLATE_TIMEOUT", "10"))
        self._send_think_flag = True

    @lru_cache(maxsize=512)
    def to_english(self, text: str) -> tuple[str, str]:
        """(english, how): how is "llm" or "glossary"."""
        english, how = self._to_english(text)
        return with_age(text, english), how

    def _to_english(self, text: str) -> tuple[str, str]:
        if not self.use_llm:
            return glossary_translate(text), "glossary"
        body = {
            "model": self.model,
            "messages": [{"role": "system", "content": _TRANSLATE_PROMPT},
                         {"role": "user", "content": text.strip()[:1000] + " /no_think"}],
            "format": _SCHEMA,
            "stream": False, "keep_alive": "30m",
            "options": {"temperature": 0, "num_predict": 200, "num_ctx": 2048},
        }
        if self._send_think_flag:
            body["think"] = False
        started = time.monotonic()
        try:
            request = urllib.request.Request(self.url + "/api/chat", data=json.dumps(body).encode(),
                                             headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                content = json.loads(response.read()).get("message", {}).get("content", "")
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.S).strip()
            content = str(json.loads(content).get("english", "")).replace("/no_think", "").strip()
            # A translation is about as long as the message; anything much longer is not one.
            if content and len(content) <= 3 * len(text) + 40:
                log.info("translated in %d ms: %r -> %r", (time.monotonic() - started) * 1000, text, content)
                return content, "llm"
        except urllib.error.HTTPError as exc:
            if self._send_think_flag and "think" in exc.read().decode(errors="replace").lower():
                self._send_think_flag = False
                return self._to_english(text)
        except Exception as exc:  # LLM down or too slow
            log.warning("translation failed (%s); using the glossary", exc)
        return glossary_translate(text), "glossary"


# --------------------------------------------------------------------------
# English reply -> Spanish reply
# --------------------------------------------------------------------------
CONDITION_ES = {
    "Cardiac Arrest": "Paro cardíaco",
    "Cardiac Arrest (Drowning)": "Paro cardíaco (ahogamiento)",
    "Heart Attack": "Ataque al corazón",
    "Choking": "Atragantamiento",
    "Anaphylaxis": "Anafilaxia (reacción alérgica grave)",
    "Diabetic Emergency": "Emergencia diabética",
    "Stroke": "Derrame cerebral",
    "Opioid Overdose": "Sobredosis de opioides",
    "Severe Bleeding": "Sangrado grave",
    "Burns (Chemical to Eye)": "Químico en el ojo",
    "Burns (Thermal)": "Quemaduras (calor)",
    "Poisoning / Ingestion": "Envenenamiento / Ingestión",
    "Seizures": "Convulsiones",
    "Head, Neck, or Spinal Injury": "Lesión de cabeza, cuello o columna",
}
CUE_ES = {
    "Cardiac Arrest": "No responde y no respira normalmente",
    "Cardiac Arrest (Drowning)": "Sacado del agua, no responde o no respira",
    "Heart Attack": "Despierto, con dolor o presión en el pecho",
    "Choking": "Despierto pero no puede respirar, toser ni hablar; algo atorado",
    "Anaphylaxis": "Reacción alérgica: hinchazón, ronchas, le cuesta respirar",
    "Diabetic Emergency": "Tiene diabetes; tembloroso, sudoroso, confundido (azúcar baja)",
    "Stroke": "De repente: cara caída, debilidad de un lado o habla arrastrada",
    "Opioid Overdose": "Después de drogas o pastillas para el dolor; muy difícil de despertar, respira lento",
    "Severe Bleeding": "Sale mucha sangre de una herida",
    "Burns (Chemical to Eye)": "Le salpicó un químico en los ojos",
    "Burns (Thermal)": "Quemadura por calor, fuego, vapor o líquido caliente",
    "Poisoning / Ingestion": "Tragó o respiró algo dañino",
    "Seizures": "Sacudidas o temblores, rígido, ojos en blanco",
    "Head, Neck, or Spinal Injury": "Lastimado en una caída, choque o golpe en la cabeza, el cuello o la espalda",
}
OPTION_ES = {
    "None of these": "Ninguna de estas",
    "Not responding and not breathing (or only gasping)": "No responde y no respira (o solo boquea)",
    "Not responding, but breathing": "No responde, pero respira",
    "Awake and responding": "Despierto y responde",
    AGE_OPTIONS[0]: "Adulto",
    AGE_OPTIONS[1]: "Niño (de 1 año a la pubertad)",
    AGE_OPTIONS[2]: "Bebé (menor de 1 año)",
    **CONDITION_ES,
}
HINT_ES = {"None of these": "Mejor describe lo que ves", **CUE_ES}

_TRIAGE_Q_ES = "**¿La persona te responde y respira normalmente?**"
_GASP_ES = "Boquear no es respirar normalmente."
_DESCRIBE_ES = ("De acuerdo. Describe en pocas palabras lo que ves: qué pasó, si la persona está despierta "
                "y si respira normalmente.")
_PAIR_Q_ES = {
    frozenset(["Cardiac Arrest", "Cardiac Arrest (Drowning)"]):
        "¿Pasó en el agua o después de estar en el agua (ahogamiento), o la persona se desplomó en tierra firme (paro cardíaco)?",
}
MESSAGE_ES = {
    "**Is the person responding to you, and are they breathing normally?**\n\nGasping is not normal breathing.":
        f"{_TRIAGE_Q_ES}\n\n{_GASP_ES}",
    "**Is the person responding to you, and are they breathing normally?** Tap the answer that fits best.\n\n"
    "Gasping is not normal breathing.":
        f"{_TRIAGE_Q_ES} Toca la respuesta que mejor encaje.\n\n{_GASP_ES}",
    "Thanks. **Please tap the one that matches best.**": "Gracias. **Toca la opción que mejor encaje.**",
    "**Tap the one that matches best.**": "**Toca la opción que mejor encaje.**",
    "This doesn't look like one of the emergencies PrimaCura covers. **If one of these matches, tap it.**":
        "Esto no parece una de las emergencias que cubre PrimaCura. **Si alguna de estas encaja, tócala.**",
    "I still can't tell which emergency this is. **Tap the guide that fits best**, or describe what you see.":
        "Todavía no sé qué emergencia es. **Toca la guía que mejor encaje**, o describe lo que ves.",
    "Okay. Please describe what you see in a few words: what happened, whether the person is awake, and whether "
    "they are breathing normally.": _DESCRIBE_ES,
    "PrimaCura's guides are for people, not animals. For a pet emergency, call your vet or an emergency animal "
    "hospital now. In the US you can also call the ASPCA Animal Poison Control Center at (888) 426-4435 (a fee "
    "may apply).\n\nIf a person is hurt or unwell too, tell me what is happening to them.":
        "Las guías de PrimaCura son para personas, no para animales. Si es una emergencia de una mascota, llama "
        "ahora a tu veterinario o a un hospital veterinario de emergencia. En EE. UU. también puedes llamar al "
        "Centro de Control de Envenenamiento Animal de la ASPCA al (888) 426-4435 (puede tener costo).\n\n"
        "Si también hay una persona herida o enferma, dime qué le pasa.",
    "Sorry, I couldn't understand that. Please describe what is happening in a few words, for example: \"he "
    "collapsed and is not breathing\".":
        "Perdón, no lo entendí. Describe en pocas palabras lo que pasa, por ejemplo: \"se desplomó y no respira\".",
}
for _pair, _info in CLARIFICATION_PAIRS.items():
    if _pair in _PAIR_Q_ES:
        MESSAGE_ES[f"**{_info['question']}**"] = f"**{_PAIR_Q_ES[_pair]}**"

_AGE_Q = re.compile(r"^This looks like \*\*(.+?)\*\*, but the correct steps depend on the patient's age", re.S)


def message_es(message: str) -> str:
    if not message:
        return message
    if message in MESSAGE_ES:
        return MESSAGE_ES[message]
    m = _AGE_Q.match(message)
    if m:
        name = CONDITION_ES.get(m.group(1), m.group(1))
        return (f"Parece **{name}**, pero los pasos correctos dependen de la edad de la persona y no son "
                "intercambiables.\n\n**¿Es un adulto, un niño (de 1 año a la pubertad) o un bebé (menor de 1 año)?**")
    log.warning("no Spanish text for message: %r", message[:120])
    return message


class SpanishGuides:
    def __init__(self, dataset: pd.DataFrame, csv_path: Path = ES_CSV):
        es = pd.read_csv(csv_path)
        by_key = {str(r.guide_id).strip(): r for r in es.itertuples()}
        self.by_protocol: dict[str, tuple[str, str]] = {}
        for row in dataset.itertuples():
            key = str(row.guide_title).strip()
            if key not in by_key:
                raise ValueError(f"{csv_path.name} has no guide_id {key!r}")
            r = by_key[key]
            self.by_protocol[row.reformatted_output] = (str(r.guide_title).strip(),
                                                        format_protocol(strip_howto(r.output)))
        pchCore.STEP_ACTION[SAFETY_STEP_ES] = pchCore.SAFETY_ACTION_ES

    def protocol(self, english_response: str) -> tuple[str, str] | None:
        """(title, response) in Spanish for a protocol reply ("SAFETY_STEP\\n<steps>")."""
        head, _, steps = english_response.partition("\n")
        if head != SAFETY_STEP or steps not in self.by_protocol:
            return None
        title, es_steps = self.by_protocol[steps]
        return title, f"{SAFETY_STEP_ES}\n{es_steps}"


def localize(result: dict) -> dict:
    """Put a serialized /chat/ reply into Spanish (option values stay English).

    Protocol replies get their Spanish steps before serializing (see
    SpanishGuides.protocol), so here only the message and the options change.
    """
    result = dict(result)
    result["lang"] = "es"
    options = result.get("options") or []
    result["option_labels"] = [OPTION_ES.get(o, o) for o in options]
    result["option_hints"] = [HINT_ES.get(o, "") for o in options]
    result["message"] = message_es(result.get("message", ""))
    return result
