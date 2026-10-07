# Condition-matching evaluation

| File | What it is |
|---|---|
| `heldout_testset_v1.csv` | 260 new cases written 2026-10-05. **Held out: never tune keywords, dataset text or thresholds against these.** Use it only to measure. |
| `regression_testset_oct4.csv` | The 85 cases from the Oct 4 sheet, with the tester's clarification answers as scripted replies. Fine to use while developing. |
| `user_testset_oct5.csv` | The user's 60 queries (Voice / Message / Search), added 2026-10-06. No scripted replies. |
| `realworld_testset_oct6.csv` | 103 real queries collected 2026-10-06 from public sources (26 quoted 911 callers, 71 forum/Q&A titles, 6 searches), each with its source URL. Verbatim or trimmed, never reworded. One ("how to treat a burn") also appears in the how-to training phrasings. |
| `testset_conditions_oct6.csv` | The user's second sheet (131 queries, Voice / Message / Search), 2026-10-06. The first 60 are the Oct-5 set; the 71 new ones are M509–M579 in the master set. |
| `build_testset.py` | Source of the held-out set (edit here, then regenerate). |
| `run_eval.py` | Runs a set against the live `/chat/` endpoint and prints the scores. Standard library only. |

```bash
# backend running on 127.0.0.1:8000, run from primacura-backend/
python tests/eval/run_eval.py tests/eval/regression_testset_oct4.csv
python tests/eval/run_eval.py tests/eval/heldout_testset_v1.csv
python tests/eval/run_eval.py tests/eval/user_testset_oct5.csv
```

`tests/test_training_data.py` fails if any example in
`data/master-training-examples.csv` shares a 5-word run with (or normalises to
the same text as) a message or scripted reply in `master-test-set.csv`.

Columns: `Expected_Age_Band` is only set where the protocol differs by age
(Cardiac Arrest, Choking). `Follow_Up_Replies` are scripted replies separated
by ` || `, sent in order whenever the app asks a question.

Scores:
* **strict**: correct protocol (and age variant) with no simulated taps on condition buttons. Age-button taps are allowed, since the user always knows the patient's age.
* **assisted**: also allows one tap on the correct condition button when the app offers it.
* **wrong protocol / time-critical**: a protocol was shown and it was the wrong one. Track this separately from accuracy; it matters more.
* **Out of scope** cases count as correct only when the app does *not* show a protocol.

The labels should be reviewed by a clinician before this set is used to sign off a release.
Once the held-out set has been used to make decisions a few times it is no longer held out:
write `heldout_testset_v2` and move v1 to the regression pile.

## Results log

| Date | Engine | Held-out strict | Held-out within one tap | Held-out wrong protocol | Regression within one tap |
|---|---|---|---|---|---|
| 2026-10-05 | retrieval + keyword rules (after filler-word fixes) | 142/260 (54.6%) | 194/260 (74.6%) | 21 (8.1%) | 81/85 |
| 2026-10-05 | triage + classifier + tap-to-pick (`pchTriage`) | 204/260 (78.5%) | 255/260 (98.1%) | 4 (1.5%) | 82/85 |
| 2026-10-05 | **+ Qwen3 4B second opinion** (`pchLLM`, must agree with classifier's top guess) | 235/260 (90.4%) | 256/260 (98.5%) | 4 (1.5%) | 82/85 |

| 2026-10-06 | + second training dataset (from an earlier prototype), nonsense gate, "drowned" as a water word | 244/260 (93.8%) | 256/260 (98.5%) | 4 (1.5%) | 83/85 |
| 2026-10-06 | + how-to phrasings, water-word rule (drowning steps only when water is mentioned) | 241/260 (92.7%) | 255/260 (98.1%) | 4 (1.5%) | 82/85 |

All three sets, 2026-10-06 (405 queries; same simulated user for every engine):

| Engine | Strict | Within one tap | Wrong protocol |
|---|---|---|---|
| Earlier prototype backend, no taps available | 335 (82.7%) | 335 | 7 |
| PrimaCura 2026-10-05, no LLM | 310 (76.5%) | 393 (97.0%) | 8 |
| PrimaCura 2026-10-05, with LLM | 350 (86.4%) | 394 (97.3%) | 9 |
| PrimaCura 2026-10-06, no LLM | 353 (87.2%) | 394 (97.3%) | 8 |
| PrimaCura 2026-10-06, with LLM | 370 (91.4%) | 395 (97.5%) | 8 |
| PrimaCura 2026-10-06 + how-to phrasings + water-word rule, no LLM | 358 (88.4%) | 396 (97.8%) | 7 |
| **PrimaCura 2026-10-06 + how-to phrasings + water-word rule, with LLM** | **371 (91.6%)** | **396 (97.8%)** | **8** |

Real-world set (103), 2026-10-06, same engine as the last row above:

| | Strict | Within one tap | Wrong protocol |
|---|---|---|---|
| With LLM | 84 (81.6%) | 97 (94.2%) | 4 (3.9%) |
| Without LLM | 80 (77.7%) | 98 (95.1%) | 3 (2.9%) |

All four sets (508 queries), 2026-10-06, after the LLM tie-break (0.5–0.65 needs LLM agreement), negation stripping, contrast examples, animal rule and drug slang in the gate:

| | Strict | Within one tap | Wrong protocol |
|---|---|---|---|
| Before, with LLM | 455 (89.6%) | 493 (97.0%) | 12 (2.4%) |
| **After, with LLM** | 444 (87.4%) | **502 (98.8%)** | **4 (0.8%)** |
| Before, without LLM | 438 (86.2%) | 494 (97.2%) | 10 |
| After, without LLM | 442 (87.0%) | 499 (98.2%) | 7 |

Then (same day): uninformative replies (only an age, yes/no, filler) to a question re-ask it once and are never added to the classifier's text; once the LLM disagrees with the classifier, nothing is shown without its agreement for the rest of the conversation. With LLM: 445 strict / 503 within one tap / 3 wrong. Without LLM: 443 / 499 / 7.

2026-10-06 (later): 71 new queries from the user's second sheet added as M509–M579 (master set now 579). 19 training examples sharing a 5-word run with them were removed; 8 CPR hand-placement/how-to and 4 choking-technique examples were added; the pet check now treats riding falls ("fell off horse") and "humans" as a person.

| 579-case master set | Strict | Within one tap | Wrong protocol |
|---|---|---|---|
| New 71, before fixes, with LLM | 58 | 68 | 1 |
| **New 71, after fixes, with LLM** | **61** | **71** | **0** |
| New 71, after fixes, without LLM | 55 | 69 | 1 (CPR hand placement -> Heart Attack) |
| Original 508, after fixes, with LLM | 445 | 503 | 3 |
| Original 508, after fixes, without LLM | 442 | 498 | 6 |

Per set, after the first batch, with LLM (strict / within one tap / wrong): Oct-4 73/83/2, held-out 240/259/0, user's 60 52/60/0, real-world 79/100/2.
Caveat: the contrast examples were written after seeing the failures, so the gains on the cases they fix are optimistic.

Note: v1 has now been used to choose between options (LLM model choice, the
"isn't moving or breathing" rule), so treat it as a regression set from here on.

Caveat: the training examples and the held-out set were written by the same
author, so wording styles overlap more than with real users. Build v2 from
queries written by other people (and real speech transcripts) before trusting
these numbers for a release.

## Improving the classifier

1. Add rows (`text,condition,source`) to `data/master-training-examples.csv` (never copy wording from a test set), then run `python -m pytest tests/test_training_data.py`.
2. Restart the backend; it retrains at startup (embeddings are cached in `app_first_aid_vectordb/`).
3. Run the regression set while iterating; run the held-out set only at milestones.

For offline experiments, start the backend with `PRIMACURA_DEV_ENDPOINTS=1` and POST to
`/dev/embed_csv` (`{"path": ..., "column": ..., "out": "tests/eval/_cache/x.npy"}`) to export
embeddings made by the production model. Never set that flag in production.
