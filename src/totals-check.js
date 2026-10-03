/**
 * The results screen shows each player's total before the race. Comparing those to the races
 * recorded so far catches a race that was missed, or recorded in the wrong order (for example
 * when the standings screen was captured instead of the results).
 */

/** @typedef {import("./mogi.js").Mogi} Mogi */
/** @typedef {import("./player.js").Player} Player */
/** @typedef {import("./race.js").Race} Race */

/**
 * @typedef {Object} TotalsMismatch
 * @prop {string} name
 * @prop {number} expected
 * @prop {number} shown
 *
 * @typedef {Object} TotalsCheck
 * @prop {'ok'|'wrong'|'missed'|'unknown'} result ok: the totals match; wrong: a race seems to be
 *   recorded wrong; missed: a race seems to be missing; unknown: too little could be read to tell
 * @prop {number} from first race (1-based) that could be at fault
 * @prop {number} to last race (1-based) that could be at fault
 * @prop {TotalsMismatch[]} mismatches
 */

/** A total is misread now and then, so it takes this many players disagreeing to raise the alarm */
const MIN_MISMATCHES = 2;
/** ...and this many players compared for the check to mean anything */
const MIN_CHECKED = 6;
/** Totals this much higher than expected, all together, are a whole race's worth of points */
const MISSING_RACE_POINTS = 30;

/**
 * The total the game showed for the player before this race, if it was read.
 * @param {Race} race
 * @param {Player} player
 */
function shownTotal(race, player) {
	const p = race.placements.find(x => x.playerId === player.id);
	return p && !p.dc ? race.gameScores[p.placement - 1]?.total ?? null : null;
}

/**
 * Points the player got in the race as the game counts them, or null if unknown.
 * Read from the results screen; failing that, the Lounge points are the same as the game's when all 12 finished.
 * @param {Race} race
 * @param {Player} player
 */
function gamePoints(race, player) {
	const p = race.placements.find(x => x.playerId === player.id);
	if (!p || p.dc) return null; // the game's total for a player who disconnected can't be predicted
	const read = race.gameScores[p.placement - 1]?.points;
	if (read != null) return read;
	return race.placements.length === 12 && race.placements.every(x => !x.dc) ? p.score : null;
}

/**
 * Check the totals shown on a race's results screen against the races before it.
 * @param {Mogi} mogi
 * @param {number} index of the race whose screen to check
 * @param {Map<number, TotalsCheck>} [earlier] checks of earlier races, worked out along the way
 * @returns {TotalsCheck}
 */
export function checkTotals(mogi, index, earlier = new Map()) {
	const races = mogi.races;
	// A race whose players were put in the wrong places can't be measured from: its totals belong to other players
	const mixedUp = (/** @type {number} */ r) => {
		if (!earlier.has(r)) earlier.set(r, checkTotals(mogi, r, earlier));
		const check = /** @type {TotalsCheck} */(earlier.get(r));
		return check.result === 'wrong' && check.from === r + 1 && check.to === r + 1;
	};
	const race = races[index];
	/** @type {TotalsMismatch[]} */
	const mismatches = [];
	let checked = 0;
	let from = index + 1;
	for (const player of mogi.roster) {
		const shown = race ? shownTotal(race, player) : null;
		if (shown == null) continue;

		// Start from the last total the game showed for this player, and add up the points since
		let anchor = 0, base = 0;
		for (let r = index - 1; r >= 0; r--) {
			const total = mixedUp(r) ? null : shownTotal(races[r], player);
			if (total != null) { anchor = r; base = total; break; }
		}
		// a substitute starts from 0 when they join the room
		if (player.substitutes.some(s => s.joinedAt > anchor && s.joinedAt <= index)) continue;
		let expected = /** @type {number|null} */(base);
		for (let r = anchor; r < index && expected != null; r++) {
			const points = gamePoints(races[r], player);
			expected = points == null ? null : expected + points;
		}
		if (expected == null) continue;

		checked++;
		if (expected !== shown) {
			mismatches.push({ name: player.activePlayer.name, expected, shown });
			from = Math.min(from, anchor + 1);
		}
	}

	const to = index;
	if (checked < MIN_CHECKED) return { result: 'unknown', from, to, mismatches };
	if (mismatches.length < MIN_MISMATCHES) return { result: 'ok', from, to, mismatches };
	// Players showing each other's totals were put in each other's places in this very race
	const sorted = (/** @type {number[]} */ list) => list.toSorted((a, b) => a - b).join();
	if (sorted(mismatches.map(m => m.shown)) === sorted(mismatches.map(m => m.expected))) {
		return { result: 'wrong', from: index + 1, to: index + 1, mismatches };
	}
	const extra = mismatches.reduce((sum, m) => sum + m.shown - m.expected, 0);
	const missed = index === 0 || (mismatches.every(m => m.shown > m.expected) && extra >= MISSING_RACE_POINTS);
	return { result: missed ? 'missed' : 'wrong', from, to, mismatches };
}
