#!/usr/bin/env node
// Validates skill-graph.json in this folder.
// Usage: node validate-skill-graph.mjs [path/to/skill-graph.json]
// Checks: top-level shape, unique well-formed ids, domain/stage validity, required fields,
// measurable mastery criteria, allowed exercise types, prereqs exist, prereq stage <= skill stage,
// acyclicity, Lichess theme keys valid, kbRef file + heading anchor exist.
// Exit code 0 = pass, 1 = errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'skill-graph.json');
const kbDir = path.dirname(file);
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const ALLOWED_EXERCISES = ['lesson','coordinate-drill','move-drill','puzzle','mate-drill','endgame-drill','opening-drill','guess-the-move','calculation-drill','visualization-drill','play-bot','game-review','quiz'];
const EXPECTED_DOMAINS = ['rules','tactics','checkmate','calculation','strategy','endgame','opening','practical'];
const EXPECTED_STAGES = [[1,'Foundations',0,600],[2,'Beginner',600,1000],[3,'Novice',1000,1400],[4,'Intermediate',1400,1800],[5,'Advanced',1800,2100],[6,'Expert',2100,2300],[7,'Master',2300,2450],[8,'Grandmaster',2450,2700]];
const REQUIRED = ['id','name','domain','stage','prereqs','lichessThemes','summary','masteryCriteria','exerciseTypes','kbRef','references'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

let g;
try { g = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error(`FAIL: cannot read/parse ${file}: ${e.message}`); process.exit(1); }

// ---- top level
if (g.version !== '1.0') err(`version must be "1.0" (got ${JSON.stringify(g.version)})`);
if (!Array.isArray(g.domains) || JSON.stringify(g.domains) !== JSON.stringify(EXPECTED_DOMAINS)) err(`domains must equal ${JSON.stringify(EXPECTED_DOMAINS)}`);
if (!Array.isArray(g.stages) || g.stages.length !== 8) err('stages must have 8 entries');
else g.stages.forEach((s, i) => {
  const [id, name, lo, hi] = EXPECTED_STAGES[i];
  if (s.id !== id || s.name !== name || !Array.isArray(s.eloRange) || s.eloRange[0] !== lo || s.eloRange[1] !== hi) err(`stage[${i}] must be {id:${id},name:"${name}",eloRange:[${lo},${hi}]}`);
});
if (!Array.isArray(g.lichessThemeKeys) || g.lichessThemeKeys.length === 0) err('lichessThemeKeys must be a non-empty array');
const themeSet = new Set(g.lichessThemeKeys || []);
if (themeSet.size !== (g.lichessThemeKeys || []).length) err('lichessThemeKeys contains duplicates');
for (const t of g.lichessThemeKeys || []) if (!/^[a-zA-Z0-9]+$/.test(t)) err(`invalid theme key format: ${t}`);
if (!Array.isArray(g.skills) || g.skills.length === 0) { err('skills must be a non-empty array'); report(); }

// ---- markdown heading anchors (GitHub-style slugs)
const anchorCache = new Map();
function anchorsFor(md) {
  if (anchorCache.has(md)) return anchorCache.get(md);
  const p = path.join(kbDir, md);
  let set = null;
  if (fs.existsSync(p)) {
    set = new Set();
    const counts = {};
    let inFence = false;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      if (/^```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;
      const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
      if (!m) continue;
      let slug = m[1].toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
      if (counts[slug] !== undefined) { counts[slug]++; slug = `${slug}-${counts[slug]}`; } else counts[slug] = 0;
      set.add(slug);
    }
  }
  anchorCache.set(md, set);
  return set;
}

// ---- per-skill checks
const byId = new Map();
for (const [i, s] of g.skills.entries()) {
  const where = `skill[${i}]${s && s.id ? ` (${s.id})` : ''}`;
  for (const f of REQUIRED) if (!(f in s)) err(`${where}: missing field "${f}"`);
  if (typeof s.id !== 'string' || !ID_RE.test(s.id)) { err(`${where}: id must be lowercase dot-separated "<domain>.<topic>[.<subtopic>]"`); continue; }
  if (byId.has(s.id)) err(`${where}: duplicate id`);
  byId.set(s.id, s);
  const prefix = s.id.split('.')[0];
  if (!EXPECTED_DOMAINS.includes(s.domain)) err(`${where}: unknown domain "${s.domain}"`);
  if (prefix !== s.domain) err(`${where}: id prefix "${prefix}" does not match domain "${s.domain}"`);
  if (!Number.isInteger(s.stage) || s.stage < 1 || s.stage > 8) err(`${where}: stage must be an integer 1-8`);
  for (const f of ['name','summary','masteryCriteria','kbRef']) if (typeof s[f] !== 'string' || !s[f].trim()) err(`${where}: "${f}" must be a non-empty string`);
  if (typeof s.masteryCriteria === 'string') {
    if (s.masteryCriteria.length < 25) err(`${where}: masteryCriteria too short to be concrete`);
    if (!/\d/.test(s.masteryCriteria)) err(`${where}: masteryCriteria must contain a measurable number (count, %, time, rating)`);
  }
  if (!Array.isArray(s.prereqs)) err(`${where}: prereqs must be an array`);
  if (!Array.isArray(s.lichessThemes)) err(`${where}: lichessThemes must be an array`);
  else for (const t of s.lichessThemes) if (!themeSet.has(t)) err(`${where}: lichess theme "${t}" not in lichessThemeKeys`);
  if (!Array.isArray(s.exerciseTypes) || s.exerciseTypes.length === 0) err(`${where}: exerciseTypes must be a non-empty array`);
  else for (const e of s.exerciseTypes) if (!ALLOWED_EXERCISES.includes(e)) err(`${where}: exercise type "${e}" not allowed`);
  if (!Array.isArray(s.references) || s.references.length === 0) err(`${where}: references must be a non-empty array`);
  if (typeof s.kbRef === 'string') {
    const m = /^([a-z0-9-]+\.md)#(.+)$/.exec(s.kbRef);
    if (!m) err(`${where}: kbRef must look like "file.md#anchor"`);
    else {
      const anchors = anchorsFor(m[1]);
      if (!anchors) err(`${where}: kbRef file ${m[1]} not found in ${kbDir}`);
      else if (!anchors.has(m[2])) err(`${where}: kbRef anchor #${m[2]} not found in ${m[1]}`);
    }
  }
  for (const k of Object.keys(s)) if (!REQUIRED.includes(k)) warn(`${where}: extra field "${k}"`);
}

// ---- prereq checks
for (const s of g.skills) {
  if (!Array.isArray(s.prereqs)) continue;
  const seen = new Set();
  for (const p of s.prereqs) {
    if (seen.has(p)) err(`${s.id}: duplicate prereq ${p}`);
    seen.add(p);
    if (p === s.id) { err(`${s.id}: lists itself as prereq`); continue; }
    const ps = byId.get(p);
    if (!ps) { err(`${s.id}: prereq "${p}" does not exist`); continue; }
    if (ps.stage > s.stage) err(`${s.id} (stage ${s.stage}): prereq ${p} is at a later stage (${ps.stage})`);
  }
  if (s.prereqs.length === 0 && s.stage !== 1) warn(`${s.id}: root skill (no prereqs) at stage ${s.stage}`);
}

// ---- acyclicity (Kahn) + cycle report
const indeg = new Map([...byId.keys()].map((id) => [id, 0]));
const out = new Map([...byId.keys()].map((id) => [id, []]));
for (const s of g.skills) for (const p of s.prereqs || []) if (byId.has(p) && p !== s.id) { indeg.set(s.id, indeg.get(s.id) + 1); out.get(p).push(s.id); }
const queue = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
let visited = 0;
while (queue.length) { const n = queue.shift(); visited++; for (const m of out.get(n)) { indeg.set(m, indeg.get(m) - 1); if (indeg.get(m) === 0) queue.push(m); } }
if (visited !== byId.size) {
  const left = new Set([...indeg].filter(([, d]) => d > 0).map(([id]) => id));
  // find one concrete cycle by DFS over prereq edges restricted to unresolved nodes
  const state = new Map(); const stack = []; let cycle = null;
  const dfs = (n) => {
    state.set(n, 1); stack.push(n);
    for (const p of byId.get(n).prereqs || []) {
      if (!left.has(p) || cycle) continue;
      if (state.get(p) === 1) { cycle = stack.slice(stack.indexOf(p)).concat(p); return; }
      if (!state.get(p)) dfs(p);
    }
    stack.pop(); state.set(n, 2);
  };
  for (const n of left) { if (!state.get(n) && !cycle) dfs(n); }
  err(`cycle detected (${left.size} skills blocked). Example cycle ("A requires B"): ${cycle ? cycle.join(' requires ') : 'n/a'}`);
}

// ---- coverage info
const leaves = [...byId.keys()].filter((id) => out.get(id).length === 0);
const lowLeaves = leaves.filter((id) => byId.get(id).stage <= 3);
for (const id of lowLeaves) warn(`${id}: stage ${byId.get(id).stage} skill is not a prerequisite of anything (dead end)`);
const usedThemes = new Set(g.skills.flatMap((s) => s.lichessThemes || []));
const unused = [...themeSet].filter((t) => !usedThemes.has(t));
if (unused.length) warn(`Lichess themes not used by any skill: ${unused.join(', ')}`);

report();

function report() {
  const skills = Array.isArray(g.skills) ? g.skills : [];
  const byStage = {}; const byDomain = {};
  for (const s of skills) { byStage[s.stage] = (byStage[s.stage] || 0) + 1; byDomain[s.domain] = (byDomain[s.domain] || 0) + 1; }
  console.log(`skill-graph: ${skills.length} skills, ${themeSet.size} Lichess theme keys`);
  console.log('by stage :', JSON.stringify(byStage));
  console.log('by domain:', JSON.stringify(byDomain));
  for (const w of warnings) console.log('WARN', w);
  if (errors.length) { for (const e of errors) console.log('ERROR', e); console.log(`FAIL: ${errors.length} error(s)`); process.exit(1); }
  console.log('PASS');
  process.exit(0);
}
