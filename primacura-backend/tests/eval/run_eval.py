#!/usr/bin/env python3
"""Run a PrimaCura test set against the live /chat/ endpoint and score it.

Usage (backend running on 127.0.0.1:8000):
    python tests/eval/run_eval.py tests/eval/heldout_testset_v1.csv
    python tests/eval/run_eval.py tests/eval/regression_testset_oct4.csv --url http://127.0.0.1:8000

Writes <testset>_results_<timestamp>.csv next to the test set and prints a
summary. Standard library only.

Each case gets a fresh session. The conversation is driven like this:
  * success                  -> stop and score the protocol shown.
  * age question             -> send the next scripted reply if there is one,
                                otherwise tap the age button that matches
                                Expected_Age_Band (an adult for "any").
  * safety (triage) question -> scripted reply if any, otherwise tap the
                                truthful answer for the expected condition.
  * two-way question         -> send the next scripted reply if there is one,
                                otherwise (button mode only) tap the expected
                                condition IF the app offered it as a button.
  * anything else            -> send the next scripted reply, or stop.

Two headline numbers are reported:
  * strict   - correct protocol with no simulated button taps for conditions
               (age and safety-question taps are allowed: the user can see
               the patient's age and whether they are breathing).
  * assisted - also allows one tap on the correct condition button, i.e. a
               user who can answer the app's question correctly.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.request
import uuid
from collections import Counter, defaultdict
from pathlib import Path

AGE_BUTTONS = {"adult": "Adult", "child": "Child (1 year to puberty)", "infant": "Infant (under 1 year)"}
# Safety (triage) question: the simulated user answers truthfully for the
# expected condition, like the age question. Keep in sync with pchTriage.
TRIAGE_ARREST = "Not responding and not breathing (or only gasping)"
TRIAGE_UNRESPONSIVE_BREATHING = "Not responding, but breathing"
TRIAGE_AWAKE = "Awake and responding"
TRIAGE_ANSWER = {
    "Cardiac Arrest": TRIAGE_ARREST,
    "Cardiac Arrest (Drowning)": TRIAGE_ARREST,
    "Opioid Overdose": TRIAGE_UNRESPONSIVE_BREATHING,
    "Diabetic Emergency": TRIAGE_UNRESPONSIVE_BREATHING,
    "Seizures": TRIAGE_UNRESPONSIVE_BREATHING,
    "Head, Neck, or Spinal Injury": TRIAGE_UNRESPONSIVE_BREATHING,
    "Poisoning / Ingestion": TRIAGE_UNRESPONSIVE_BREATHING,
}
AGE_SENSITIVE = {"Cardiac Arrest", "Choking"}
# Wrong answers on these are the ones most likely to cost a life.
TIME_CRITICAL = {"Cardiac Arrest", "Cardiac Arrest (Drowning)", "Choking", "Anaphylaxis",
                 "Opioid Overdose", "Severe Bleeding"}
OUT_OF_SCOPE = "Out of scope"
MAX_TURNS = 6


def post_chat(url: str, query: str, session_id: str, timeout: float = 30.0) -> dict:
    body = json.dumps({"query": query, "session_id": session_id}).encode()
    req = urllib.request.Request(f"{url.rstrip('/')}/chat/", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def protocol_variant(condition: str, steps: list[str]) -> str:
    """Which age variant of the protocol was shown, from its text."""
    text = " ".join(steps[:4]).lower()  # first step is the scene-safety reminder
    if condition not in AGE_SENSITIVE:
        return "any"
    if "infant" in text:
        return "infant"
    if condition == "Choking":
        return "adult/child"
    if "child" in text or "pediatric" in text:  # the adult CPR steps never mention a child
        return "child"
    return "adult"


def variant_ok(expected_band: str, variant: str) -> bool:
    if expected_band in ("", "any") or variant == "any":
        return True
    return expected_band in variant.split("/")


def run_case(url: str, case: dict, allow_condition_tap: bool) -> dict:
    session = f"eval-{uuid.uuid4().hex[:12]}"
    scripted = [r.strip() for r in (case.get("Follow_Up_Replies") or "").split("||") if r.strip()]
    expected = case["Expected_Condition"]
    band = (case.get("Expected_Age_Band") or "any").strip().lower()

    transcript, used_tap = [], False
    out = post_chat(url, case["User_Query"], session)
    transcript.append((case["User_Query"], out))
    first = out

    for _ in range(MAX_TURNS):
        status = out.get("status")
        if status == "success":
            break
        options = out.get("options") or []
        if scripted:
            reply = scripted.pop(0)
        elif status == "age_clarification_needed":
            reply = AGE_BUTTONS.get(band, "Adult")
        elif TRIAGE_AWAKE in options:
            reply = TRIAGE_ANSWER.get(expected, TRIAGE_AWAKE)
        elif status == "clarification_needed" and allow_condition_tap and expected in options:
            reply, used_tap = expected, True
        else:
            break
        out = post_chat(url, reply, session)
        transcript.append((reply, out))

    final_ok_status = out.get("status") == "success"
    title = out.get("title", "") if final_ok_status else ""
    variant = protocol_variant(title, out.get("steps", [])) if final_ok_status else ""

    if expected == OUT_OF_SCOPE:
        correct = not final_ok_status
        wrong_protocol = final_ok_status
    else:
        correct = final_ok_status and title == expected and variant_ok(band, variant)
        wrong_protocol = final_ok_status and not correct

    return {
        "first_status": first.get("status"),
        "first_title": first.get("title", ""),
        "first_options": " | ".join(first.get("options") or []),
        "final_status": out.get("status"),
        "final_title": title,
        "protocol_variant": variant,
        "turns": len(transcript),
        "used_condition_tap": used_tap,
        "correct": correct,
        "wrong_protocol": wrong_protocol,
        "critical_error": wrong_protocol and expected in TIME_CRITICAL,
        "transcript": " >> ".join(f"[{u}] -> {o.get('status')}:{o.get('title') or '/'.join(o.get('options') or [])}"
                                  for u, o in transcript),
    }


def pct(n: int, d: int) -> str:
    return f"{n}/{d} ({100 * n / d:.1f}%)" if d else "0/0"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("testset")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--limit", type=int, default=0, help="run only the first N cases")
    args = ap.parse_args()

    path = Path(args.testset)
    with path.open(newline="") as fh:
        cases = list(csv.DictReader(fh))
    if args.limit:
        cases = cases[: args.limit]

    rows = []
    started = time.time()
    for i, case in enumerate(cases, 1):
        strict = run_case(args.url, case, allow_condition_tap=False)
        assisted = run_case(args.url, case, allow_condition_tap=True)
        row = dict(case)
        row.update({f"strict_{k}": v for k, v in strict.items()})
        row.update({f"assisted_{k}": v for k, v in assisted.items() if k in
                    ("final_status", "final_title", "protocol_variant", "turns", "used_condition_tap",
                     "correct", "wrong_protocol", "critical_error")})
        rows.append(row)
        print(f"\r{i}/{len(cases)}", end="", file=sys.stderr)
    print(file=sys.stderr)

    stamp = time.strftime("%Y%m%d-%H%M%S")
    out_path = path.with_name(f"{path.stem}_results_{stamp}.csv")
    with out_path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    n = len(rows)
    in_scope = [r for r in rows if r["Expected_Condition"] != OUT_OF_SCOPE]
    print(f"\nTest set: {path.name}  ({n} cases, {time.time() - started:.0f}s)")
    print(f"Strict accuracy (no condition taps):     {pct(sum(r['strict_correct'] for r in rows), n)}")
    print(f"Assisted accuracy (one correct tap):     {pct(sum(r['assisted_correct'] for r in rows), n)}")
    print(f"First reply was the right protocol:      "
          f"{pct(sum(r['strict_first_status'] == 'success' and r['strict_first_title'] == r['Expected_Condition'] for r in in_scope), len(in_scope))} of in-scope")
    print(f"Wrong protocol shown (strict):           {pct(sum(r['strict_wrong_protocol'] for r in rows), n)}")
    print(f"  of which time-critical:                {pct(sum(r['strict_critical_error'] for r in rows), n)}")
    print(f"No protocol reached (strict, in scope):  "
          f"{pct(sum(r['strict_final_status'] != 'success' for r in in_scope), len(in_scope))}")
    print(f"Asked a question on the first reply:     "
          f"{pct(sum(r['strict_first_status'] != 'success' for r in in_scope), len(in_scope))} of in-scope")

    print("\nPer condition (strict / assisted):")
    by = defaultdict(list)
    for r in rows:
        by[r["Expected_Condition"]].append(r)
    for cond in sorted(by):
        rs = by[cond]
        print(f"  {cond:32s} {pct(sum(r['strict_correct'] for r in rs), len(rs)):>16s}"
              f"   {pct(sum(r['assisted_correct'] for r in rs), len(rs)):>16s}")

    if "Category" in rows[0]:
        print("\nPer category (strict):")
        by = defaultdict(list)
        for r in rows:
            by[r["Category"]].append(r)
        for cat in sorted(by):
            rs = by[cat]
            print(f"  {cat:16s} {pct(sum(r['strict_correct'] for r in rs), len(rs))}")

    confusions = Counter((r["Expected_Condition"], r["strict_final_title"] + (f" [{r['strict_protocol_variant']}]" if r["strict_protocol_variant"] not in ("", "any") else ""))
                         for r in rows if r["strict_wrong_protocol"])
    if confusions:
        print("\nWrong protocols shown (expected -> shown):")
        for (exp, got), k in confusions.most_common():
            print(f"  {k} x  {exp} -> {got}")

    print(f"\nDetailed results: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
