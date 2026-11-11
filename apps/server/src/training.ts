// Training events -> rating pools, skill mastery, FSRS cards, games, daily history. Also Me / ProgressSnapshot / plan.
//
// Skill mastery model (documented contract for the learn agent):
//   mastery_n = mastery_{n-1} + ALPHA * (score - mastery_{n-1}), starting at 0, ALPHA = 0.3 (exponentially weighted success rate)
//   attempts += 1 per event touching the skill; successes += 1 when score >= 0.7
//   mastered becomes true when mastery >= 0.85 AND attempts >= MASTERY_MIN_ATTEMPTS (5);
//   it is revoked only if mastery later falls below 0.6 (hysteresis, so one slip does not un-master a skill).
//   Scores: lesson/drill `score` in 0..1 (values > 1 are treated as percentages); puzzle = 1 solved first try,
//   0.5 solved after a mistake, 0 failed, applied to every skill whose lichessThemes contain one of the puzzle's themes.
// Rating pools (Glicko-2, one rating period per event; a game is one period):
//   puzzle: opponent = puzzle rating/RD, score 1 only when solved on the first try (Lichess semantics)
//   bot: rated bot games, opponent = opponentRating ?? botLevelRating(botLevel), RD = opponentRd ?? 60
//   online: updated only by the server's own WebSocket games (client-posted online/lan games are stored, not rated)
//   assessment: rating = moving average of `estimatedRating` (alpha 0.5), rd shrinks 200 -> 50 by x0.8 per section
import { createHash, randomUUID } from 'node:crypto';
import { DEFAULT_BOT_LADDER, estimateRating, generateDailyPlan, gradePuzzle, newCard, newRating, review, stageForRating, updateRating } from '@grim/core';
import type { DailyPlan, DetailedEstimate, EstimateInputs, Profile, RatingPool, RatingState, SkillState, SrsCard, TitleCode, TrainingEvent } from '@grim/core';
import type { DB } from './db.ts';
import { tx } from './db.ts';
import { HttpError } from './http.ts';
import type { Curriculum } from './curriculum.ts';
import type { Puzzles } from './puzzles.ts';
import { dueCards, getCard, getProfile, getRating, getRatings, getSkill, getSkills, saveCard, setRating, setSkill } from './store.ts';

export const MASTERY_ALPHA = 0.3;
export const MASTERY_THRESHOLD = 0.85;
export const MASTERY_MIN_ATTEMPTS = 5;
export const MASTERY_REVOKE = 0.6;

export interface Me { profile: Profile; ratings: Partial<Record<RatingPool, RatingState>>; estimate: DetailedEstimate | null }
export interface ProgressSnapshot {
  skills: Record<string, SkillState>;
  ratings: Partial<Record<RatingPool, RatingState>>;
  estimate: DetailedEstimate | null;
  history: { date: string; estimate: number; puzzle?: number; bot?: number; minutes?: number }[];
  totals: { minutes: number; puzzles: number; lessons: number; games: number; streakDays: number };
}

/** Fallback rating for a bot level when the client does not send opponentRating (DEFAULT_BOT_LADDER mirrors BOT_LEVELS). */
export const botLevelRating = (level: number) =>
  DEFAULT_BOT_LADDER.find((b) => b.id === level)?.rating ?? Math.round(400 + Math.max(0, level - 1) * 125);

/**
 * Standard time control (measurement model: 15+10 rapid or slower), from strings like "15+10" (minutes) or "900+10"
 * (seconds). Estimated duration = initial + 40 x increment must reach that of 15+10 (900 + 400 s).
 */
export function isStandardTc(tc: string | null | undefined): boolean {
  const m = /^\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*$/.exec(tc ?? '');
  if (!m) return false;
  let initial = Number(m[1]);
  if (initial <= 180) initial *= 60; // minutes
  return initial + 40 * Number(m[2]) >= 1300;
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isDate = (v: unknown) => isStr(v) && !Number.isNaN(Date.parse(v));
const EXERCISES = new Set(['lesson', 'coordinate-drill', 'move-drill', 'puzzle', 'mate-drill', 'endgame-drill', 'opening-drill', 'guess-the-move', 'calculation-drill', 'visualization-drill', 'play-bot', 'game-review', 'quiz']);

/** Returns an error message, or null when the event is a valid TrainingEvent. */
export function validateEvent(e: unknown): string | null {
  if (!e || typeof e !== 'object') return 'event must be an object';
  const o = e as Record<string, unknown>;
  if (!isDate(o.at)) return 'at must be an ISO date';
  switch (o.type) {
    case 'lesson':
      if (!isStr(o.lessonId) || !isStrArr(o.skillIds) || !isNum(o.score) || !isNum(o.durationSec)) return 'lesson: lessonId, skillIds, score, durationSec required';
      return null;
    case 'puzzle':
      if (!isStr(o.puzzleId) || !isNum(o.puzzleRating) || !isStrArr(o.themes) || !isBool(o.solved) || !isBool(o.firstTry) || !isNum(o.durationSec)) return 'puzzle: puzzleId, puzzleRating, themes, solved, firstTry, durationSec required';
      return null;
    case 'drill':
      if (!isStr(o.drill) || !EXERCISES.has(o.drill) || !isStrArr(o.skillIds) || !isNum(o.score) || !isNum(o.durationSec)) return 'drill: drill (ExerciseType), skillIds, score, durationSec required';
      return null;
    case 'game':
      if (!['bot', 'local', 'online', 'lan'].includes(o.mode as string)) return 'game: invalid mode';
      if (![0, 0.5, 1].includes(o.result as number)) return 'game: result must be 1, 0.5 or 0';
      if (o.color !== 'white' && o.color !== 'black') return 'game: color must be white or black';
      if (!isStr(o.pgn) || o.pgn.length > 100_000 || !isBool(o.rated)) return 'game: pgn and rated required';
      for (const k of ['opponentRating', 'opponentRd', 'botLevel', 'accuracy', 'acpl', 'blunders']) if (o[k] !== undefined && !isNum(o[k])) return `game: ${k} must be a number`;
      return null;
    case 'assessment':
      if (!isStr(o.assessmentId) || !isStr(o.section) || !isNum(o.score) || !isNum(o.maxScore)) return 'assessment: assessmentId, section, score, maxScore required';
      if (o.estimatedRating !== undefined && !isNum(o.estimatedRating)) return 'assessment: estimatedRating must be a number';
      return null;
    default:
      return 'unknown event type';
  }
}

const norm01 = (s: number) => Math.max(0, Math.min(1, s > 1 ? s / 100 : s));
const dateOf = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

function lessonGrade(score: number): 1 | 2 | 3 | 4 {
  return score < 0.5 ? 1 : score < 0.75 ? 2 : score < 0.95 ? 3 : 4;
}

/** Rough duration for game events (they carry no duration): 30 s per full move, capped at an hour. */
function gameMinutes(e: Extract<TrainingEvent, { type: 'game' }>): number {
  const d = (e as { durationSec?: unknown }).durationSec;
  if (isNum(d)) return d / 60;
  const fullMoves = (e.pgn.match(/\d+\.(?!\.)/g) ?? []).length;
  return Math.min(60, fullMoves * 0.5);
}

export class Training {
  db: DB;
  curriculum: Curriculum;
  puzzles: Puzzles;
  constructor(db: DB, curriculum: Curriculum, puzzles: Puzzles) { this.db = db; this.curriculum = curriculum; this.puzzles = puzzles; }

  private themeSkills(): Map<string, string[]> {
    const m = new Map<string, string[]>();
    for (const s of this.curriculum.graph.skills) for (const t of s.lichessThemes ?? []) {
      const list = m.get(t) ?? [];
      list.push(s.id);
      m.set(t, list);
    }
    return m;
  }

  private touchSkill(userId: string, skillId: string, score: number, at: string): void {
    const s: SkillState = getSkill(this.db, userId, skillId) ?? { skillId, mastery: 0, attempts: 0, successes: 0, mastered: false };
    s.mastery = s.mastery + MASTERY_ALPHA * (score - s.mastery);
    s.attempts++;
    if (score >= 0.7) s.successes++;
    if (!s.lastPracticed || at > s.lastPracticed) s.lastPracticed = at;
    if (s.mastery >= MASTERY_THRESHOLD && s.attempts >= MASTERY_MIN_ATTEMPTS) s.mastered = true;
    else if (s.mastery < MASTERY_REVOKE) s.mastered = false;
    setSkill(this.db, userId, s);
  }

  private reviewCard(userId: string, id: string, kind: SrsCard['kind'], grade: 1 | 2 | 3 | 4, at: Date): SrsCard {
    const card = review(getCard(this.db, userId, id) ?? newCard(id, kind, at), grade, at);
    saveCard(this.db, userId, card);
    return card;
  }

  private addMinutes(userId: string, date: string, minutes: number): void {
    if (!(minutes > 0)) return;
    this.db.prepare(`INSERT INTO daily (user_id, date, minutes) VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET minutes = minutes + excluded.minutes`).run(userId, date, Math.min(minutes, 600));
  }

  /** Store a finished game for a user (used for HTTP game events and for server-run online games). */
  storeGame(userId: string, e: Extract<TrainingEvent, { type: 'game' }>, opponent: string): string {
    const id = randomUUID();
    this.db.prepare(`INSERT INTO games (id, user_id, at, mode, result, color, opponent, opponent_rating, accuracy, acpl, blunders, time_control, rated, pgn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, userId, e.at, e.mode, e.result, e.color, opponent, e.opponentRating ?? null, e.accuracy ?? null, e.acpl ?? null, e.blunders ?? null,
      e.timeControl ?? null, e.rated ? 1 : 0, e.pgn);
    return id;
  }

  private applyEvent(userId: string, profile: Profile, e: TrainingEvent, opts: { trusted: boolean; opponentName?: string }): void {
    const at = new Date(e.at);
    const date = dateOf(e.at);
    switch (e.type) {
      case 'lesson': {
        const score = norm01(e.score);
        for (const s of e.skillIds) this.touchSkill(userId, s, score, e.at);
        this.reviewCard(userId, `lesson:${e.lessonId}`, 'lesson', lessonGrade(score), at);
        this.addMinutes(userId, date, e.durationSec / 60);
        break;
      }
      case 'drill': {
        const score = norm01(e.score);
        for (const s of e.skillIds) this.touchSkill(userId, s, score, e.at);
        this.addMinutes(userId, date, e.durationSec / 60);
        break;
      }
      case 'puzzle': {
        const stored = this.puzzles.get(e.puzzleId);
        const win = e.solved && e.firstTry ? 1 : 0;
        const cur = getRating(this.db, userId, 'puzzle', profile);
        setRating(this.db, userId, 'puzzle', updateRating(cur, [{ opponentRating: stored?.rating ?? e.puzzleRating, opponentRd: stored?.rd ?? 80, score: win }]));
        this.reviewCard(userId, `puzzle:${e.puzzleId}`, 'puzzle', gradePuzzle(e.solved, e.firstTry, e.durationSec), at);
        this.db.prepare('INSERT INTO puzzle_attempts (user_id, puzzle_id, solved, first_try, at) VALUES (?, ?, ?, ?, ?)').run(userId, e.puzzleId, e.solved ? 1 : 0, e.firstTry ? 1 : 0, e.at);
        this.puzzles.markWoodpecker(userId, e.puzzleId);
        const score = e.solved ? (e.firstTry ? 1 : 0.5) : 0;
        const ts = this.themeSkills();
        const skills = new Set<string>();
        for (const t of stored?.themes ?? e.themes) for (const s of ts.get(t) ?? []) skills.add(s);
        for (const s of skills) this.touchSkill(userId, s, score, e.at);
        this.addMinutes(userId, date, e.durationSec / 60);
        break;
      }
      case 'game': {
        let opponent = opts.opponentName ?? (e.mode === 'bot' ? `Bot level ${e.botLevel ?? '?'}` : e.mode === 'local' ? 'Local opponent' : 'Opponent');
        if (e.mode === 'bot' && e.rated) {
          const oppRating = e.opponentRating ?? (e.botLevel !== undefined ? botLevelRating(e.botLevel) : null);
          if (oppRating !== null) {
            const cur = getRating(this.db, userId, 'bot', profile);
            setRating(this.db, userId, 'bot', updateRating(cur, [{ opponentRating: oppRating, opponentRd: e.opponentRd ?? 60, score: e.result }]));
            if (!opts.opponentName) opponent = `Bot ${Math.round(oppRating)}`;
          }
        }
        // online/lan ratings are only changed by the server's own game runner (opts.trusted), never by client posts.
        this.storeGame(userId, e, opponent);
        this.addMinutes(userId, date, gameMinutes(e));
        break;
      }
      case 'assessment': {
        if (e.estimatedRating !== undefined) {
          const prev = this.db.prepare("SELECT * FROM ratings WHERE user_id = ? AND pool = 'assessment'").get(userId) as { rating: number; rd: number; vol: number; games: number } | undefined;
          const base = prev ?? { ...newRating(e.estimatedRating, 250), games: 0 };
          const rating = prev ? base.rating * 0.5 + e.estimatedRating * 0.5 : e.estimatedRating;
          setRating(this.db, userId, 'assessment', { rating, rd: Math.max(50, base.rd * 0.8), vol: base.vol, games: base.games + 1, updatedAt: new Date().toISOString() });
        }
        const dur = (e as { durationSec?: unknown }).durationSec;
        if (isNum(dur)) this.addMinutes(userId, date, dur / 60);
        break;
      }
    }
  }

  /** Validate and apply a batch. Duplicate events (same JSON) are ignored, so clients may safely retry. */
  process(userId: string, events: unknown, opts: { trusted?: boolean; opponentName?: string } = {}): void {
    if (!Array.isArray(events)) throw new HttpError(400, 'events must be an array');
    if (events.length > 500) throw new HttpError(413, 'At most 500 events per batch');
    events.forEach((e, i) => {
      const err = validateEvent(e);
      if (err) throw new HttpError(400, `events[${i}]: ${err}`);
    });
    const sorted = [...(events as TrainingEvent[])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    tx(this.db, () => {
      const profile = getProfile(this.db, userId);
      const ins = this.db.prepare('INSERT OR IGNORE INTO events (user_id, hash, type, at, data) VALUES (?, ?, ?, ?, ?)');
      for (const e of sorted) {
        const json = JSON.stringify(e);
        const r = ins.run(userId, createHash('sha256').update(json).digest('hex'), e.type, e.at, json);
        if (r.changes === 0) continue;
        this.applyEvent(userId, profile, e, { trusted: !!opts.trusted, opponentName: opts.opponentName });
      }
      this.snapshot(userId);
    });
  }

  /**
   * Milestone evidence (measurement model section 7) computed from stored data:
   *  - previous: one evaluation per earlier day (daily.low80), the "two evaluations >= 30 days apart" rule
   *  - ratedGames180d: rated bot/online/lan games at the standard time control in the last 180 days
   *  - knowledgeGates[T]: passed when an assessment event whose section mentions "endgame" scored >= 90% and names T
   *    (assessmentId, section or detail.gate/detail.title), or when >= 90% of endgame-domain skills up to the stage
   *    that contains T's threshold are mastered.
   */
  milestoneEvidence(userId: string): NonNullable<EstimateInputs['milestoneEvidence']> {
    const previous = (this.db.prepare('SELECT date, low80 FROM daily WHERE user_id = ? AND low80 IS NOT NULL AND date < ? ORDER BY date').all(userId, today()) as { date: string; low80: number }[])
      .map((d) => ({ at: `${d.date}T23:59:59.000Z`, low80: d.low80 }));
    const since = new Date(Date.now() - 180 * 86400000).toISOString();
    const games = this.db.prepare("SELECT time_control FROM games WHERE user_id = ? AND rated = 1 AND mode IN ('bot', 'online', 'lan') AND at >= ?").all(userId, since) as { time_control: string | null }[];
    const ratedGames180d = games.filter((g) => isStandardTc(g.time_control)).length;
    const knowledgeGates: Partial<Record<TitleCode, boolean>> = {};
    const titles: [number, TitleCode][] = [[2200, 'CM'], [2300, 'FM'], [2400, 'IM'], [2500, 'GM']];
    const assessments = (this.db.prepare("SELECT data FROM events WHERE user_id = ? AND type = 'assessment'").all(userId) as { data: string }[])
      .map((r) => JSON.parse(r.data) as Extract<TrainingEvent, { type: 'assessment' }>)
      .filter((a) => /endgame/i.test(a.section) && a.maxScore > 0 && a.score / a.maxScore >= 0.9);
    const skills = getSkills(this.db, userId);
    const graph = this.curriculum.graph;
    for (const [threshold, code] of titles) {
      const named = assessments.some((a) => {
        const d = (a.detail ?? {}) as Record<string, unknown>;
        return [a.assessmentId, a.section, d.gate, d.title].some((v) => typeof v === 'string' && new RegExp(`\\b${code}\\b`, 'i').test(v));
      });
      let bySkills = false;
      if (graph.skills.length) {
        const stage = stageForRating(graph, threshold);
        const eg = graph.skills.filter((s) => s.domain === 'endgame' && s.stage <= stage);
        bySkills = eg.length > 0 && eg.filter((s) => skills[s.id]?.mastered).length / eg.length >= 0.9;
      }
      knowledgeGates[code] = named || bySkills;
    }
    return { previous, ratedGames180d, knowledgeGates };
  }

  estimate(userId: string): DetailedEstimate | null {
    const r = getRatings(this.db, userId);
    const profile = getProfile(this.db, userId);
    const acc = this.db.prepare("SELECT AVG(accuracy) AS mean, COUNT(*) AS n FROM (SELECT accuracy FROM games WHERE user_id = ? AND accuracy IS NOT NULL AND mode != 'local' ORDER BY at DESC LIMIT 20)").get(userId) as { mean: number | null; n: number };
    // Bot games count as standard TC when most rated bot games of the last 180 days were 15+10 or slower.
    const since = new Date(Date.now() - 180 * 86400000).toISOString();
    const botTcs = this.db.prepare("SELECT time_control FROM games WHERE user_id = ? AND rated = 1 AND mode = 'bot' AND at >= ?").all(userId, since) as { time_control: string | null }[];
    const standardTimeControl = botTcs.length > 0 && botTcs.filter((g) => isStandardTc(g.time_control)).length / botTcs.length >= 0.5;
    try {
      return estimateRating({
        bot: r.bot, puzzle: r.puzzle, online: r.online,
        accuracy: acc.n ? { meanAccuracy: acc.mean ?? 0, games: acc.n } : null,
        assessment: r.assessment ? { rating: r.assessment.rating, sd: r.assessment.rd, updatedAt: r.assessment.updatedAt } : null,
        startingLevel: profile.startingLevel,
        standardTimeControl,
        now: new Date().toISOString(),
        milestoneEvidence: this.milestoneEvidence(userId),
      }) as DetailedEstimate;
    } catch (e) {
      console.error('[estimate] estimateRating failed:', e);
      return null;
    }
  }

  /** Record today's estimate (and its lower 80% bound) / puzzle / bot ratings in the daily history. */
  snapshot(userId: string): void {
    const r = getRatings(this.db, userId);
    const est = this.estimate(userId);
    this.db.prepare(`INSERT INTO daily (user_id, date, estimate, low80, puzzle, bot, minutes) VALUES (?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(user_id, date) DO UPDATE SET estimate = excluded.estimate, low80 = excluded.low80, puzzle = excluded.puzzle, bot = excluded.bot`)
      .run(userId, today(), est?.rating ?? null, est?.low80 ?? null, r.puzzle?.rating ?? null, r.bot?.rating ?? null);
  }

  me(userId: string): Me {
    return { profile: getProfile(this.db, userId), ratings: getRatings(this.db, userId), estimate: this.estimate(userId) };
  }

  progress(userId: string): ProgressSnapshot {
    const rows = this.db.prepare('SELECT * FROM daily WHERE user_id = ? ORDER BY date').all(userId) as { date: string; estimate: number | null; puzzle: number | null; bot: number | null; minutes: number }[];
    const history: ProgressSnapshot['history'] = [];
    let lastEst = 0, lastPuzzle: number | undefined, lastBot: number | undefined;
    for (const d of rows) {
      if (d.estimate !== null) lastEst = d.estimate;
      if (d.puzzle !== null) lastPuzzle = d.puzzle;
      if (d.bot !== null) lastBot = d.bot;
      history.push({ date: d.date, estimate: Math.round(lastEst), ...(lastPuzzle !== undefined ? { puzzle: Math.round(lastPuzzle) } : {}), ...(lastBot !== undefined ? { bot: Math.round(lastBot) } : {}), minutes: Math.round(d.minutes) });
    }
    const counts = this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM events WHERE user_id = ? AND type = 'puzzle') AS puzzles,
      (SELECT COUNT(*) FROM events WHERE user_id = ? AND type = 'lesson') AS lessons,
      (SELECT COUNT(*) FROM games WHERE user_id = ?) AS games`).get(userId, userId, userId) as { puzzles: number; lessons: number; games: number };
    const activeDays = new Set(this.db.prepare('SELECT DISTINCT substr(at, 1, 10) AS d FROM events WHERE user_id = ?').all(userId).map((r) => (r as { d: string }).d));
    for (const d of rows) if (d.minutes > 0) activeDays.add(d.date);
    let streak = 0;
    const day = new Date(today() + 'T00:00:00Z');
    if (!activeDays.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1); // today not done yet: streak still alive
    while (activeDays.has(day.toISOString().slice(0, 10))) { streak++; day.setUTCDate(day.getUTCDate() - 1); }
    return {
      skills: getSkills(this.db, userId), ratings: getRatings(this.db, userId), estimate: this.estimate(userId), history,
      totals: { minutes: Math.round(rows.reduce((s, d) => s + d.minutes, 0)), puzzles: counts.puzzles, lessons: counts.lessons, games: counts.games, streakDays: streak },
    };
  }

  // ---------- daily plan (cached per user per UTC day) ----------
  private cachedPlan(userId: string, date: string): DailyPlan | null {
    const row = this.db.prepare('SELECT data FROM plans WHERE user_id = ? AND date = ?').get(userId, date) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as DailyPlan) : null;
  }

  private buildPlan(userId: string, date: string, doneBlockIds: string[]): DailyPlan {
    const profile = getProfile(this.db, userId);
    const completedLessons = (this.db.prepare("SELECT DISTINCT json_extract(data, '$.lessonId') AS id FROM events WHERE user_id = ? AND type = 'lesson'").all(userId) as { id: string | null }[])
      .map((r) => r.id).filter((x): x is string => !!x);
    const plan = generateDailyPlan({
      profile, graph: this.curriculum.graph, skills: getSkills(this.db, userId), dueCards: dueCards(this.db, userId),
      estimate: this.estimate(userId), date,
      lessons: this.curriculum.index.filter((l) => l.track === profile.track),
      completedLessons, doneBlockIds, bots: DEFAULT_BOT_LADDER,
    });
    for (const b of plan.blocks) if (doneBlockIds.includes(b.id)) b.done = true;
    this.db.prepare('INSERT INTO plans (user_id, date, data) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET data = excluded.data').run(userId, date, JSON.stringify(plan));
    return plan;
  }

  plan(userId: string): DailyPlan {
    const date = today();
    const cached = this.cachedPlan(userId, date);
    if (cached?.blocks?.length) return cached;
    return this.buildPlan(userId, date, (cached?.blocks ?? []).filter((b) => b.done).map((b) => b.id));
  }

  completeBlock(userId: string, blockId: string): DailyPlan {
    const plan = this.plan(userId);
    const block = plan.blocks.find((b) => b.id === blockId);
    if (!block) throw new HttpError(404, 'No such plan block today');
    block.done = true;
    this.db.prepare('UPDATE plans SET data = ? WHERE user_id = ? AND date = ?').run(JSON.stringify(plan), userId, plan.date ?? today());
    return plan;
  }

  /** Clear today's cached plan (after onboarding/profile changes). */
  invalidatePlan(userId: string): void {
    const date = today();
    const cached = this.cachedPlan(userId, date);
    if (!cached) return;
    this.buildPlan(userId, date, cached.blocks.filter((b) => b.done).map((b) => b.id)); // keep today's done blocks
  }

  srsReview(userId: string, body: { cardId?: unknown; kind?: unknown; grade?: unknown }): SrsCard {
    const kinds = ['puzzle', 'lesson', 'opening', 'endgame', 'pattern'];
    if (!isStr(body.cardId) || body.cardId.length > 200) throw new HttpError(400, 'cardId required');
    if (!isStr(body.kind) || !kinds.includes(body.kind)) throw new HttpError(400, 'invalid kind');
    if (![1, 2, 3, 4].includes(body.grade as number)) throw new HttpError(400, 'grade must be 1-4');
    return tx(this.db, () => this.reviewCard(userId, body.cardId as string, body.kind as SrsCard['kind'], body.grade as 1 | 2 | 3 | 4, new Date()));
  }
}
