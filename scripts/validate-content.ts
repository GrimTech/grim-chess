// Validates the curriculum content: `npm run validate:content` (Node 24 type stripping).
//  - knowledge-base/03-chess-knowledge/skill-graph.json: unique ids, prereqs exist, acyclic, stage/domain valid
//  - content/lessons/**/*.json against the Lesson type: required fields, skillIds exist, FENs legal (chess.js),
//    MoveStep solutions legal from their FEN (learner/opponent alternate), QuizStep answer in range, PlayStep FEN legal.
// Prints a summary; exits 1 when there are errors (warnings do not fail).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import type { Lesson, SkillGraph } from '@grim/core';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const GRAPH_FILE = path.join(ROOT, 'knowledge-base/03-chess-knowledge/skill-graph.json');
const LESSONS_DIR = path.resolve(ROOT, process.env.LESSONS_DIR ?? 'content/lessons');

const DOMAINS = ['rules', 'tactics', 'checkmate', 'calculation', 'strategy', 'endgame', 'opening', 'practical'];
const EXERCISES = ['lesson', 'coordinate-drill', 'move-drill', 'puzzle', 'mate-drill', 'endgame-drill', 'opening-drill', 'guess-the-move', 'calculation-drill', 'visualization-drill', 'play-bot', 'game-review', 'quiz'];
const SQUARE = /^[a-h][1-8]$/;

const errors: string[] = [];
const warnings: string[] = [];
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir).sort()) {
    const f = path.join(dir, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n.endsWith('.json')) out.push(f);
  }
  return out;
}

/** Returns a Chess instance for a legal position, or an error string. */
export function loadFen(fen: unknown): Chess | string {
  if (typeof fen !== 'string' || !fen.trim()) return 'missing FEN';
  let c: Chess;
  try { c = new Chess(fen); } catch (e) { return `invalid FEN "${fen}": ${(e as Error).message}`; }
  // The side that is NOT to move must not be in check.
  const mover = c.turn();
  const idle = mover === 'w' ? 'b' : 'w';
  const board = c.board();
  for (const row of board) for (const sq of row) {
    if (sq && sq.type === 'k' && sq.color === idle && c.isAttacked(sq.square, mover)) return `illegal FEN "${fen}": side not to move is in check`;
  }
  return c;
}

// ---------- skill graph ----------
let graph: SkillGraph | null = null;
const skillIds = new Set<string>();
if (!existsSync(GRAPH_FILE)) err(rel(GRAPH_FILE), 'not found');
else {
  try { graph = JSON.parse(readFileSync(GRAPH_FILE, 'utf8')) as SkillGraph; } catch (e) { err(rel(GRAPH_FILE), `invalid JSON: ${(e as Error).message}`); }
}
if (graph) {
  const where = rel(GRAPH_FILE);
  if (!Array.isArray(graph.skills)) err(where, 'skills must be an array');
  const skills = Array.isArray(graph.skills) ? graph.skills : [];
  const stageIds = new Set((graph.stages ?? []).map((s) => s.id));
  const domains = new Set(graph.domains?.length ? graph.domains : DOMAINS);
  const themeKeys = graph.lichessThemeKeys?.length ? new Set(graph.lichessThemeKeys) : null;
  const kbDir = path.join(ROOT, 'knowledge-base/03-chess-knowledge');
  for (const s of skills) {
    const w = `${where} skill ${s?.id ?? '(no id)'}`;
    if (!s || typeof s.id !== 'string' || !s.id) { err(where, 'skill without id'); continue; }
    if (skillIds.has(s.id)) err(w, 'duplicate id');
    skillIds.add(s.id);
    if (typeof s.name !== 'string' || !s.name) err(w, 'missing name');
    if (!domains.has(s.domain)) err(w, `unknown domain "${s.domain}"`);
    if (!Number.isInteger(s.stage) || s.stage < 1 || s.stage > 8) err(w, `stage must be 1..8 (got ${s.stage})`);
    else if (stageIds.size && !stageIds.has(s.stage)) err(w, `stage ${s.stage} not in stages`);
    if (!Array.isArray(s.prereqs)) err(w, 'prereqs must be an array');
    if (!Array.isArray(s.lichessThemes)) err(w, 'lichessThemes must be an array');
    else if (themeKeys) for (const t of s.lichessThemes) if (!themeKeys.has(t)) warn(w, `lichess theme "${t}" not in lichessThemeKeys`);
    if (!Array.isArray(s.exerciseTypes) || !s.exerciseTypes.length) err(w, 'exerciseTypes must be a non-empty array');
    else for (const t of s.exerciseTypes) if (!EXERCISES.includes(t)) err(w, `unknown exercise type "${t}"`);
    if (typeof s.summary !== 'string' || !s.summary) warn(w, 'missing summary');
    if (typeof s.masteryCriteria !== 'string' || !s.masteryCriteria) warn(w, 'missing masteryCriteria');
    if (s.kbRef && !existsSync(path.join(kbDir, s.kbRef.split('#')[0]))) warn(w, `kbRef file not found: ${s.kbRef}`);
  }
  for (const s of skills) for (const p of s?.prereqs ?? []) {
    if (!skillIds.has(p)) err(`${where} skill ${s.id}`, `prereq "${p}" does not exist`);
    if (p === s.id) err(`${where} skill ${s.id}`, 'skill is its own prereq');
  }
  // cycle detection (iterative DFS, white/grey/black)
  const byId = new Map(skills.filter((s) => s?.id).map((s) => [s.id, s]));
  const state = new Map<string, 1 | 2>();
  const reported = new Set<string>();
  for (const start of byId.keys()) {
    if (state.has(start)) continue;
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    const pathIds: string[] = [start];
    state.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const prereqs = (byId.get(top.id)?.prereqs ?? []).filter((p) => byId.has(p));
      if (top.i >= prereqs.length) { state.set(top.id, 2); stack.pop(); pathIds.pop(); continue; }
      const next = prereqs[top.i++];
      const st = state.get(next);
      if (st === 1) {
        const cycle = [...pathIds.slice(pathIds.indexOf(next)), next].join(' -> ');
        if (!reported.has(cycle)) { reported.add(cycle); err(where, `prerequisite cycle: ${cycle}`); }
      } else if (!st) { state.set(next, 1); stack.push({ id: next, i: 0 }); pathIds.push(next); }
    }
  }
  // stage ordering sanity: a prereq should not be at a later stage
  for (const s of skills) for (const p of s?.prereqs ?? []) {
    const ps = byId.get(p);
    if (ps && ps.stage > s.stage) warn(`${where} skill ${s.id}`, `prereq ${p} is at a later stage (${ps.stage} > ${s.stage})`);
  }
}

// ---------- lessons ----------
const lessonFiles = walk(LESSONS_DIR);
const lessonIds = new Map<string, string>();
let stepCount = 0;
const byTrack: Record<string, number> = {};

function checkArrows(where: string, arrows: unknown) {
  if (arrows === undefined) return;
  if (!Array.isArray(arrows)) return err(where, 'arrows must be an array');
  for (const a of arrows) {
    if (!Array.isArray(a) || !SQUARE.test(a[0]) || !SQUARE.test(a[1])) err(where, `invalid arrow ${JSON.stringify(a)}`);
    else if (a[2] !== undefined && !['green', 'red', 'blue', 'yellow'].includes(a[2])) err(where, `invalid arrow color ${a[2]}`);
  }
}

for (const file of lessonFiles) {
  const where = rel(file);
  let l: Lesson;
  try { l = JSON.parse(readFileSync(file, 'utf8')) as Lesson; } catch (e) { err(where, `invalid JSON: ${(e as Error).message}`); continue; }
  const str = (k: keyof Lesson) => { if (typeof l[k] !== 'string' || !(l[k] as string).trim()) err(where, `${String(k)} must be a non-empty string`); };
  str('id'); str('title'); str('summary');
  if (typeof l.id === 'string') {
    if (lessonIds.has(l.id)) err(where, `duplicate lesson id ${l.id} (also in ${lessonIds.get(l.id)})`);
    lessonIds.set(l.id, where);
    { const base = path.basename(file, '.json'); const slug = l.id.split('.').pop() ?? ''; if (base !== l.id && !base.endsWith(slug)) warn(where, `file name does not match id ${l.id}`); }
  }
  if (l.track !== 'adult' && l.track !== 'kids') err(where, `track must be adult or kids (got ${l.track})`);
  else {
    byTrack[l.track] = (byTrack[l.track] ?? 0) + 1;
    const dirTrack = path.relative(LESSONS_DIR, file).split(path.sep)[0];
    if (dirTrack !== l.track) warn(where, `track "${l.track}" but file is under content/lessons/${dirTrack}`);
  }
  if (!Number.isInteger(l.stage) || l.stage < 1 || l.stage > 8) err(where, `stage must be an integer 1..8 (got ${l.stage})`);
  if (typeof l.order !== 'number' || !Number.isFinite(l.order)) err(where, 'order must be a number');
  if (typeof l.estMinutes !== 'number' || !(l.estMinutes > 0)) err(where, 'estMinutes must be a positive number');
  if (l.minAge !== undefined && (typeof l.minAge !== 'number' || l.minAge < 3)) err(where, 'minAge must be a number >= 3');
  if (!Array.isArray(l.skillIds) || !l.skillIds.length) err(where, 'skillIds must be a non-empty array');
  else if (graph) for (const s of l.skillIds) if (!skillIds.has(s)) err(where, `unknown skillId "${s}"`);
  if (l.practiceThemes !== undefined && (!Array.isArray(l.practiceThemes) || !l.practiceThemes.every((t) => typeof t === 'string'))) err(where, 'practiceThemes must be a string array');
  if (!Array.isArray(l.steps) || !l.steps.length) { err(where, 'steps must be a non-empty array'); continue; }

  l.steps.forEach((step, i) => {
    stepCount++;
    const w = `${where} steps[${i}] (${(step as { type?: string })?.type ?? '?'})`;
    if (!step || typeof step !== 'object') return err(w, 'step must be an object');
    switch (step.type) {
      case 'text':
        if (typeof step.md !== 'string' || !step.md.trim()) err(w, 'md required');
        break;
      case 'board': {
        const c = loadFen(step.fen);
        if (typeof c === 'string') err(w, c);
        if (typeof step.md !== 'string') err(w, 'md required');
        checkArrows(w, step.arrows);
        if (step.highlights !== undefined && (!Array.isArray(step.highlights) || !step.highlights.every((h) => SQUARE.test(h)))) err(w, 'highlights must be squares');
        if (step.orientation !== undefined && step.orientation !== 'white' && step.orientation !== 'black') err(w, 'orientation must be white or black');
        break;
      }
      case 'move': {
        if (typeof step.prompt !== 'string' || !step.prompt.trim()) err(w, 'prompt required');
        if (typeof step.explain !== 'string') err(w, 'explain required');
        checkArrows(w, step.arrows);
        const c = loadFen(step.fen);
        if (typeof c === 'string') { err(w, c); break; }
        if (!Array.isArray(step.solution) || !step.solution.length) { err(w, 'solution must be a non-empty SAN array'); break; }
        const start = step.fen;
        for (let k = 0; k < step.solution.length; k++) {
          const san = step.solution[k];
          const who = k % 2 === 0 ? 'learner' : 'opponent';
          try { c.move(san); } catch {
            err(w, `solution[${k}] "${san}" (${who}) is illegal in ${c.fen()}`);
            break;
          }
        }
        for (const alt of step.alternatives ?? []) {
          try { new Chess(start).move(alt); } catch { err(w, `alternative "${alt}" is illegal from the step FEN`); }
        }
        break;
      }
      case 'quiz': {
        if (typeof step.question !== 'string' || !step.question.trim()) err(w, 'question required');
        if (!Array.isArray(step.choices) || step.choices.length < 2) err(w, 'choices must have at least 2 entries');
        else if (!Number.isInteger(step.answer) || step.answer < 0 || step.answer >= step.choices.length) err(w, `answer index ${step.answer} out of range 0..${step.choices.length - 1}`);
        if (typeof step.explain !== 'string') err(w, 'explain required');
        if (step.fen !== undefined) { const c = loadFen(step.fen); if (typeof c === 'string') err(w, c); }
        break;
      }
      case 'play': {
        const c = loadFen(step.fen);
        if (typeof c === 'string') err(w, c);
        else if (c.isGameOver()) err(w, 'play position is already game over');
        if (!['win', 'draw', 'mate', 'promote', 'hold'].includes(step.goal)) err(w, `invalid goal "${step.goal}"`);
        if (typeof step.prompt !== 'string' || !step.prompt.trim()) err(w, 'prompt required');
        if (step.maxMoves !== undefined && !(typeof step.maxMoves === 'number' && step.maxMoves > 0)) err(w, 'maxMoves must be positive');
        break;
      }
      default:
        err(w, `unknown step type "${(step as { type?: string }).type}"`);
    }
  });
}

// ---------- coverage summary ----------
const covered = new Set<string>();
for (const f of lessonFiles) { try { for (const s of (JSON.parse(readFileSync(f, 'utf8')) as Lesson).skillIds ?? []) covered.add(s); } catch { /* reported above */ } }
const uncovered = [...skillIds].filter((s) => !covered.has(s));

console.log('Grim Chess content validation');
console.log(`  skill graph: ${graph ? `${skillIds.size} skills` : 'missing'}`);
console.log(`  lessons: ${lessonFiles.length} files (${Object.entries(byTrack).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}), ${stepCount} steps`);
console.log(`  skills without lessons: ${uncovered.length}${skillIds.size ? ` of ${skillIds.size}` : ''}`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 200)) console.log(`  ! ${w}`);
  if (warnings.length > 200) console.log(`  ... ${warnings.length - 200} more`);
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('\nFAILED');
  process.exit(1);
}
console.log('\nOK');
