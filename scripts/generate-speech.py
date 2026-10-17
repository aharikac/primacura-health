#!/usr/bin/env python3
"""Records the apps' read-aloud clips with a natural voice.

Reads scripts/speech-manifest.json (every sentence the apps can read aloud; kept
up to date by scripts/generate-guides.mjs), records each clip that is missing
into primacura-frontend/public/audio/<id>.mp3, removes recordings that are no
longer used, then runs generate-guides.mjs so both apps pick them up (it also
copies them into primacura-ios/assets/audio).

Only new or changed sentences are recorded, so after editing a guide just run
it again. Uses only the Python standard library for Google; Kokoro needs its
own packages (see below).

  python3 scripts/generate-speech.py                  # Google Cloud Text-to-Speech (default)
  python3 scripts/generate-speech.py --sample         # record 3 sample clips to try a voice
  python3 scripts/generate-speech.py --voice en-US-Chirp3-HD-Charon
  python3 scripts/generate-speech.py --redo           # re-record everything (after a voice change)
  python3 scripts/generate-speech.py --engine kokoro  # free, runs on this computer
  python3 scripts/generate-speech.py --voice-es es-US-Chirp3-HD-Leda  # another Spanish voice

Spanish clips (manifest entries with "lang": "es", from the Spanish guides) are
recorded with a Spanish voice: es-US-Chirp3-HD-Aoede on Google, ef_dora on Kokoro.

Google: needs the gcloud CLI signed in (gcloud auth login), a project set
(gcloud config set project <id>) and the Text-to-Speech API enabled on it
(gcloud services enable texttospeech.googleapis.com; the project needs billing
on). All the clips together are about 25,000 characters: well under $1 even
for the premium Chirp 3 HD voices, and free within the monthly free tier.

Kokoro (open-source, Apache-2.0): pip install "kokoro>=0.9" soundfile, plus
espeak-ng (brew install espeak-ng) and ffmpeg (brew install ffmpeg).
"""
import argparse
import base64
import json
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "scripts" / "speech-manifest.json"
AUDIO_DIR = ROOT / "primacura-frontend" / "public" / "audio"
SAMPLE_DIR = ROOT / "scripts" / "speech-samples"
RATE = 0.95  # a touch slower than normal: easier to follow while doing first aid


# ---------------------------------------------------------------- Google ----
class Google:
    URL = "https://texttospeech.googleapis.com/v1/text:synthesize"

    def __init__(self, voice):
        self.voice = voice or "en-US-Chirp3-HD-Aoede"
        self.lang = "-".join(self.voice.split("-")[:2])
        self.use_rate = True
        self.token = self._gcloud("auth", "print-access-token")
        self.project = self._gcloud("config", "get-value", "project")
        if not self.project:
            sys.exit("No Google Cloud project set. Run: gcloud config set project <your-project-id>")

    @staticmethod
    def _gcloud(*args):
        exe = shutil.which("gcloud")
        if not exe:
            sys.exit("gcloud CLI not found. Install it, then: gcloud auth login")
        out = subprocess.run([exe, *args], capture_output=True, text=True)
        if out.returncode != 0:
            sys.exit(f"gcloud {' '.join(args)} failed:\n{out.stderr.strip()}")
        return out.stdout.strip()

    def synthesize(self, text, dest):
        config = {"audioEncoding": "MP3", "sampleRateHertz": 24000}
        if self.use_rate:
            config["speakingRate"] = RATE
        body = {"input": {"text": text}, "voice": {"languageCode": self.lang, "name": self.voice}, "audioConfig": config}
        req = urllib.request.Request(self.URL, data=json.dumps(body).encode(), method="POST", headers={
            "Authorization": f"Bearer {self.token}",
            "x-goog-user-project": self.project,
            "Content-Type": "application/json; charset=utf-8",
        })
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    dest.write_bytes(base64.b64decode(json.load(r)["audioContent"]))
                return
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")
                if e.code == 400 and self.use_rate and "speaking" in detail.lower():
                    self.use_rate = False  # some voices do not take a speaking rate
                    return self.synthesize(text, dest)
                if e.code in (429, 500, 503) and attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                if e.code == 403 and "SERVICE_DISABLED" in detail:
                    sys.exit("The Text-to-Speech API is off for this project. Run:\n"
                             "  gcloud services enable texttospeech.googleapis.com")
                sys.exit(f"Google Text-to-Speech error {e.code}: {detail[:500]}")


# ---------------------------------------------------------------- Kokoro ----
class Kokoro:
    def __init__(self, voice):
        try:
            import numpy as np  # noqa: F401
            import soundfile  # noqa: F401
            from kokoro import KPipeline
        except ImportError:
            sys.exit('Kokoro is not installed. Run: pip install "kokoro>=0.9" soundfile  (and brew install espeak-ng ffmpeg)')
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg not found. Run: brew install ffmpeg")
        self.voice = voice or "af_heart"
        # Voice prefix: a = American English, b = British English, e = Spanish.
        self.pipeline = KPipeline(lang_code=self.voice[0] if self.voice[0] in "abe" else "a")

    def synthesize(self, text, dest):
        import numpy as np
        import soundfile as sf
        chunks = [audio for _, _, audio in self.pipeline(text, voice=self.voice, speed=RATE)]
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "clip.wav"
            sf.write(wav, np.concatenate(chunks), 24000)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-b:a", "48k", str(dest)], check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", choices=["google", "kokoro"], default="google")
    ap.add_argument("--voice", help="Google: e.g. en-US-Chirp3-HD-Aoede (default), en-US-Chirp3-HD-Charon, en-US-Neural2-F. Kokoro: af_heart (default), am_michael")
    ap.add_argument("--voice-es", help="Spanish clips. Google: es-US-Chirp3-HD-Aoede (default). Kokoro: ef_dora (default)")
    ap.add_argument("--sample", action="store_true", help="record 3 sample clips into scripts/speech-samples/ and stop")
    ap.add_argument("--redo", action="store_true", help="re-record every clip (e.g. after changing the voice)")
    args = ap.parse_args()

    if not MANIFEST.exists():
        sys.exit("scripts/speech-manifest.json not found. Run: node scripts/generate-guides.mjs")
    clips = json.loads(MANIFEST.read_text())["clips"]
    Engine = Google if args.engine == "google" else Kokoro
    engine = Engine(args.voice)
    engines = {"en": engine}

    def engine_for(clip):
        lang = clip.get("lang", "en")
        if lang not in engines:
            default = "es-US-Chirp3-HD-Aoede" if args.engine == "google" else "ef_dora"
            engines[lang] = Engine(args.voice_es or default)
        return engines[lang]

    if args.sample:
        SAMPLE_DIR.mkdir(exist_ok=True)
        english = [c for c in clips if c.get("lang", "en") == "en"]
        picks = sorted(english, key=lambda c: -len(c["text"]))[:2] + [c for c in english if c["text"] == "Step 3."]
        for i, c in enumerate(picks, 1):
            dest = SAMPLE_DIR / f"sample-{i}-{engine.voice}.mp3"
            engine.synthesize(c["text"], dest)
            print(f"  {dest.relative_to(ROOT)}  \"{c['text'][:70]}…\"")
        print("Listen to these, then run without --sample (add --voice to pick another).")
        return

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {c["id"] for c in clips}
    todo = [c for c in clips if args.redo or not (AUDIO_DIR / f"{c['id']}.mp3").exists()]
    spanish = sum(1 for c in todo if c.get("lang") == "es")
    print(f"{len(clips)} clips, {len(todo)} to record with {args.engine} voice {engine.voice}"
          + (f" ({spanish} Spanish, with a Spanish voice)" if spanish else ""))
    for n, c in enumerate(todo, 1):
        dest = AUDIO_DIR / f"{c['id']}.mp3"
        tmp = dest.with_suffix(".part")
        engine_for(c).synthesize(c["text"], tmp)
        tmp.replace(dest)
        print(f"  [{n}/{len(todo)}] {c['text'][:72]}")
    stale = [f for f in AUDIO_DIR.glob("*.mp3") if f.stem not in wanted]
    for f in stale:
        f.unlink()
    if stale:
        print(f"Removed {len(stale)} recordings no longer used.")
    size = sum(f.stat().st_size for f in AUDIO_DIR.glob("*.mp3")) / 1e6
    print(f"Recordings: {len(list(AUDIO_DIR.glob('*.mp3')))} files, {size:.1f} MB")

    # Let both apps pick them up (also copies them into the iOS bundle folder).
    subprocess.run(["node", str(ROOT / "scripts" / "generate-guides.mjs")], check=True)


if __name__ == "__main__":
    main()
