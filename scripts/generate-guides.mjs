#!/usr/bin/env node
// Writes src/data/conditions.ts and src/data/howTo.ts for the web and iOS apps
// from the backend's CSVs, the only place to edit them:
//   primacura-backend/data/First_Aid_Dataset_Final.csv  guide steps; a step ending in
//       [how-to: <id>] gets a "Show me how" link to that card
//   primacura-backend/data/how-to-guides.csv            How-To cards
//   primacura-backend/data/diagrams/*.svg              step diagrams (aria-label = alt text)
// A guide step is "Action | details" (the action is shown in big type) and may
// end in [facts: a; b] (pills), [diagram: <id>] (show that diagram) and [rhythm]
// (show the CPR rhythm guide). Never edit the generated .ts files.
//
//   node scripts/generate-guides.mjs          regenerate both files
//   node scripts/generate-guides.mjs --check  exit 1 if either is out of date
//
// Runs automatically before the apps start or build (npm pre-scripts) and on
// every git commit that touches the CSV (.githooks/pre-commit). Node built-ins only.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'primacura-backend', 'data');
const CSV = path.join(DATA, 'First_Aid_Dataset_Final.csv');
const HOWTO_CSV = path.join(DATA, 'how-to-guides.csv');
const DIAGRAM_DIR = path.join(DATA, 'diagrams');
const APPS = ['primacura-frontend', 'primacura-ios'].map((app) => path.join(ROOT, app, 'src', 'data'));
const REQUIRED = ['guide_title', 'situation', 'output'];
const HOWTO_REQUIRED = ['id', 'title', 'age', 'group', 'summary', 'key_facts', 'steps', 'watch_out'];
const MARK = /\s*\[(how-to|diagram):\s*([a-z0-9-]+)\]|\s*\[rhythm\]|\s*\[facts:\s*([^\]]+)\]/g;

// "Push hard [how-to: cpr-adult] [diagram: hand-position] [rhythm]" -> text + what it links to
function parseMarks(step) {
  const marks = { howTo: null, diagram: null, rhythm: false, facts: [] };
  for (const m of step.matchAll(MARK)) {
    if (m[1] === 'how-to') marks.howTo = m[2];
    else if (m[1] === 'diagram') marks.diagram = m[2];
    else if (m[3]) marks.facts = m[3].split(';').map((f) => f.trim()).filter(Boolean);
    else marks.rhythm = true;
  }
  // "Action | details": the app shows the action in big type above the details.
  const [action, ...rest] = step.replace(MARK, '').split(' | ');
  const details = rest.join(' | ').trim();
  return { text: details ? `${action.trim()} ${details}` : action.trim(), action: action.trim(), ...marks };
}

export function renderDiagrams(dir) {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.svg')).sort() : [];
  const items = files.map((f) => {
    const svg = readFileSync(path.join(dir, f), 'utf8').trim();
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const alt = (svg.match(/aria-label="([^"]*)"/) || [])[1];
    if (!vb || !alt) throw new Error(`diagrams/${f} needs a viewBox="0 0 w h" and an aria-label (alt text)`);
    return { id: f.slice(0, -4), svg, alt, aspect: +(Number(vb[1]) / Number(vb[2])).toFixed(4) };
  });
  const body = items.map((d) => `  ${q(d.id)}: { alt: ${q(d.alt)}, aspect: ${d.aspect}, svg: ${q(d.svg)} },`).join('\n');
  return {
    ids: new Set(items.map((d) => d.id)),
    content: [...HEADER('diagrams/*.svg'), "import { Diagram } from '../types';", '',
      'export const diagrams: Record<string, Diagram> = {', body, '};', ''].join('\n'),
  };
}
const HEADER = (what) => [
  '// GENERATED FILE - DO NOT EDIT.',
  `// Source: primacura-backend/data/${what}`,
  '// Regenerate: node scripts/generate-guides.mjs (runs automatically on app start/build and git commit).',
];

// Minimal RFC 4180 parser: quoted fields may contain commas, quotes ("") and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.replace(/^﻿/, '').trim(), r[i] ?? ''])));
}

// "1. Do this\n   - detail\n2. Then this" -> ["Do this\n   - detail", "Then this"]
export function splitSteps(output) {
  const steps = [];
  for (const line of output.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(/^\s*\d+\.\s+(.*)$/);
    if (m) steps.push(m[1].trim());
    else if (line.trim() && steps.length) steps[steps.length - 1] += '\n' + line.trimEnd();
  }
  return steps;
}

function requireColumns(rows, cols, file) {
  for (const col of cols) {
    if (!rows.length || !(col in rows[0])) throw new Error(`${file} is missing the "${col}" column`);
  }
}

const q = (s) => JSON.stringify(s);
const list = (s) => s.split('|').map((x) => x.trim()).filter(Boolean);

export function renderHowTo(csvText, diagramIds = null) {
  const rows = parseCsv(csvText);
  requireColumns(rows, HOWTO_REQUIRED, 'how-to-guides.csv');
  const cards = rows.map((r, i) => {
    // diagrams column: "2:hand-position|4:compression-depth" (step number : diagram id)
    const stepDiagrams = Object.fromEntries(list(r.diagrams ?? '').map((d) => d.split(':').map((x) => x.trim())));
    for (const id of Object.values(stepDiagrams)) {
      if (diagramIds && !diagramIds.has(id)) throw new Error(`how-to-guides.csv row ${i + 2}: no diagram "${id}" in data/diagrams`);
    }
    const steps = splitSteps(r.steps).map((step, n) => {
      // "Lead: rest" -> bold lead + text (only for a short lead)
      const m = step.match(/^([^:]{1,32}):\s+(.*)$/s);
      const s = m ? { lead: m[1].trim(), text: m[2].trim() } : { lead: '', text: step };
      return stepDiagrams[n + 1] ? { ...s, diagram: stepDiagrams[n + 1] } : s;
    });
    const rhythm = (r.rhythm ?? '').trim();
    if (rhythm && !['cpr', 'hands-only'].includes(rhythm)) throw new Error(`how-to-guides.csv row ${i + 2}: rhythm must be cpr, hands-only or empty`);
    if (!r.id.trim() || !r.title.trim() || !steps.length) throw new Error(`how-to-guides.csv row ${i + 2} needs an id, a title and numbered steps`);
    return { id: r.id.trim(), title: r.title.trim(), age: r.age.trim() || 'Any', group: r.group.trim(),
      // ask_age = yes: a "Show me how" link asks who needs help, then opens the group's card for that age.
      askAge: /^(yes|true|1)$/i.test((r.ask_age ?? '').trim()),
      rhythm,
      summary: r.summary.trim(), keyFacts: list(r.key_facts), steps, watchOut: list(r.watch_out) };
  });
  const body = cards.map((c) => [
    '  {',
    `    id: ${q(c.id)},`,
    `    title: ${q(c.title)},`,
    `    age: ${q(c.age)},`,
    `    group: ${q(c.group)},`,
    `    askAge: ${c.askAge},`,
    `    rhythm: ${q(c.rhythm)},`,
    `    summary: ${q(c.summary)},`,
    `    keyFacts: [${c.keyFacts.map(q).join(', ')}],`,
    '    steps: [',
    ...c.steps.map((s) => `      { lead: ${q(s.lead)}, text: ${q(s.text)}${s.diagram ? `, diagram: ${q(s.diagram)}` : ''} },`),
    '    ],',
    `    watchOut: [${c.watchOut.map(q).join(', ')}],`,
    '  },',
  ].join('\n')).join('\n');
  return {
    ids: new Set(cards.map((c) => c.id)),
    content: [...HEADER('how-to-guides.csv'), "import { HowTo } from '../types';", '',
      'export const howTos: HowTo[] = [', body, '];', ''].join('\n'),
  };
}

export function render(csvText, howToIds = null, diagramIds = null) {
  const rows = parseCsv(csvText);
  requireColumns(rows, REQUIRED, 'First_Aid_Dataset_Final.csv');
  const conditions = rows.map((r, i) => {
    const parsed = splitSteps(r.output).map(parseMarks);
    const howTo = parsed.map((p) => p.howTo);
    const diagram = parsed.map((p) => p.diagram);
    const rhythm = parsed.map((p) => p.rhythm);
    const steps = parsed.map((p) => p.text);
    const actions = parsed.map((p) => p.action);
    const facts = parsed.map((p) => p.facts);
    for (const id of howTo) {
      if (id && howToIds && !howToIds.has(id)) throw new Error(`First_Aid_Dataset_Final.csv row ${i + 2}: no How-To card "${id}" in how-to-guides.csv`);
    }
    for (const id of diagram) {
      if (id && diagramIds && !diagramIds.has(id)) throw new Error(`First_Aid_Dataset_Final.csv row ${i + 2}: no diagram "${id}" in data/diagrams`);
    }
    const c = { title: r.guide_title.trim(), description: r.situation.trim(), steps, actions, facts, howTo, diagram, rhythm };
    if (!c.title || !c.steps.length) throw new Error(`CSV row ${i + 2} needs a guide_title and numbered steps`);
    return c;
  });
  const body = conditions.map((c) => [
    '  {',
    `    title: ${q(c.title)},`,
    `    description: ${q(c.description)},`,
    '    steps: [',
    ...c.steps.map((s) => `      ${q(s)},`),
    '    ],',
    `    actions: [${c.actions.map(q).join(', ')}],`,
    ...(c.facts.some((f) => f.length) ? [`    facts: [${c.facts.map((f) => `[${f.map(q).join(', ')}]`).join(', ')}],`] : []),
    ...(c.howTo.some(Boolean) ? [`    howTo: [${c.howTo.map((h) => (h ? q(h) : 'null')).join(', ')}],`] : []),
    ...(c.diagram.some(Boolean) ? [`    diagram: [${c.diagram.map((h) => (h ? q(h) : 'null')).join(', ')}],`] : []),
    ...(c.rhythm.some(Boolean) ? [`    rhythm: [${c.rhythm.join(', ')}],`] : []),
    '  },',
  ].join('\n')).join('\n');
  return [...HEADER('First_Aid_Dataset_Final.csv'), "import { Condition } from '../types';", '',
    'export const conditions: Condition[] = [', body, '];', ''].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(CSV)) {
    console.log('[guides] backend CSV not found (e.g. inside a Docker build) - keeping the saved conditions.ts');
    process.exit(0);
  }
  const check = process.argv.includes('--check');
  const diagrams = renderDiagrams(DIAGRAM_DIR);
  const howTo = existsSync(HOWTO_CSV) ? renderHowTo(readFileSync(HOWTO_CSV, 'utf8'), diagrams.ids) : null;
  const outputs = { 'conditions.ts': render(readFileSync(CSV, 'utf8'), howTo?.ids ?? null, diagrams.ids) };
  if (howTo) outputs['howTo.ts'] = howTo.content;
  outputs['diagrams.ts'] = diagrams.content;
  let stale = 0;
  for (const dir of APPS) {
    if (!existsSync(dir)) continue;
    for (const [name, content] of Object.entries(outputs)) {
      const target = path.join(dir, name);
      const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
      if (current === content) continue;
      stale++;
      if (check) console.error(`[guides] out of date: ${path.relative(ROOT, target)}`);
      else { writeFileSync(target, content); console.log(`[guides] updated ${path.relative(ROOT, target)}`); }
    }
  }
  if (check && stale) {
    console.error('[guides] run: node scripts/generate-guides.mjs');
    process.exit(1);
  }
  if (!stale) console.log('[guides] guide files are up to date');
}
