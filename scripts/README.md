# Guide steps: one source

The first-aid guide steps live in **one place**:
`primacura-backend/data/First_Aid_Dataset_Final.csv`

| Column | Used for |
|---|---|
| `condition` | Label the backend's classifier returns (age variants share it) |
| `situation` | Who the steps are for; the backend reads the age from it; shown as the guide's description |
| `symptoms` | Reference text |
| `output` | Numbered steps, one action each: `1. Action \| details`. The action is shown in big type; keep it short |
| `guide_title` | Title shown on the Guides screen, e.g. `Cardiac Arrest — Child` |

Markers at the end of a step (never shown as text):
* `[facts: 30 pushes; 100-120 a minute]` — key numbers shown as pills;
* `[how-to: <id>]` — a **Show me how** link to that How-To card;
* `[diagram: <id>]` — shows `data/diagrams/<id>.svg` under the step;
* `[rhythm]` — shows the CPR rhythm guide (110 a minute, count to 30, breath prompts).

## How-To cards

`primacura-backend/data/how-to-guides.csv`, one row per card:

| Column | Used for |
|---|---|
| `id` | Referenced by `[how-to: <id>]` in the guide steps |
| `title`, `summary` | Card heading and one-line "when to use" |
| `age` | `Adult`, `Child`, `Infant`, `Adult/Child` or `Any` |
| `group` | Cards sharing a group (e.g. `cpr`, `choking`, `recovery`) appear as age tabs |
| `key_facts` | Short pills, separated by `\|` |
| `steps` | Numbered steps; `Lead: text` shows the lead in bold |
| `watch_out` | Warnings, separated by `\|` |
| `ask_age` | `yes`: a Show me how link asks who needs help, then opens the group's card for that age |
| `diagrams` | Step diagrams, `step:diagram-id` separated by `\|`, e.g. `2:hand-position\|4:compression-depth` |
| `rhythm` | `cpr` or `hands-only` shows the CPR rhythm guide on the card; empty for none |

## Diagrams

`primacura-backend/data/diagrams/<id>.svg`: plain SVG (no `<use>`, `<title>` or CSS, so the iOS
renderer can draw it), with `viewBox="0 0 w h"` and an `aria-label` that is the alt text.
They are copied into each app's `src/data/diagrams.ts`.

`src/data/conditions.ts`, `src/data/howTo.ts` and `src/data/diagrams.ts` in **primacura-frontend** and **primacura-ios** are generated from
these CSVs by `generate-guides.mjs`. Never edit it by hand.

It is regenerated automatically:
* before the apps start or build: `npm run dev` / `npm run build` (web), `npm start` / `npm run ios` / `npm run android` (iOS);
* on every git commit that touches the CSV or either `conditions.ts` (`.githooks/pre-commit`).

Running `npx expo ...` or `npx vite` directly skips the npm hooks; the commit hook still catches it.

Manual commands (from the repository root):

    node scripts/generate-guides.mjs          # regenerate
    node scripts/generate-guides.mjs --check  # exit 1 if out of date

One-time setup after cloning (enables the commit hook):

    git config core.hooksPath .githooks

The backend test `tests/test_guides_sync.py` fails if the files ever drift.
Changes to the steps reach iOS users only in the next App Store release; the web app
picks them up on the next deploy.
