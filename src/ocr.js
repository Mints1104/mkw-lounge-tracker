import Tesseract from 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';
import { preprocessCrop, snapshotBlobUrlFromCanvas } from './capture.js';
import { normalizeName } from './player.js';
import { Placement } from './race.js';
import { manualResolve } from './ui/manual-resolution-dialog.js';
import { ctx2d, isDebugMode, popcount } from './util.js';

/** @typedef {import("./roster.js").Roster} Roster */
/** @typedef {import("./player.js").Player} Player */
/**
 * @typedef {Object} Rect
 * @prop {number} x
 * @prop {number} y
 * @prop {number} w
 * @prop {number} h
 */

/**
 * @typedef {Object} OCRDebugRow
 * @prop {number} idx
 * @prop {Rect} rect
 * @prop {number} whiteRatio
 * @prop {string|null} rectSnapshotUrl
 * @prop {string} ocrText
 * @prop {number} confidence
 * @prop {string} normalized
 * @prop {boolean} wasBlank
 * @prop {string|null} assignedTo row index assigned to this OCR row (-1 if none)
 * @prop {number} assignedDistance final distance/cost used for this row
 * @prop {boolean} disconnected marked as disconnected due to blank
 * @prop {boolean} revokedAssign assignment revoked for exceeding max edit distance
 */
/**
 * @typedef {Object} OCRDebugReport
 * @prop {'success'|'no_scoreboard'|'manual_cancelled'|'error'} outcome
 * @prop {string} timestampISO
 * @prop {boolean} teamMode
 * @prop {number} canvasWidth
 * @prop {number} canvasHeight
 * @prop {string|null} canvasSnapshotUrl
 * @prop {string} whitelist
 * @prop {{ins:number,del:number,sub:number}} levCosts
 * @prop {number} maxEditDistance
 * @prop {number} maxNonBlankCost
 * @prop {number} blankCost
 * @prop {number} ignMismatchPenalty
 * @prop {OCRDebugRow[]} rows
 * @prop {number[][]} costMatrix
 * @prop {number[]} assignment player i -> row j
 * @prop {{place:number, playerId:string|null, resolvedName:string|null}[]} finalPlacements
 * @prop {string|undefined} errorMessage
 */
let _lastDebug = /** @type {OCRDebugReport|null} */(null);
export function getLastDebugReport() { return _lastDebug; }
function startNewDebugReport() {
	if( _lastDebug ) {
		/** @param {string|null} url */
		function tryRevokeUrl(url) {
			if( url && typeof url === 'string' && url.startsWith('blob:') ) {
				try { URL.revokeObjectURL(url); } catch {}
			}
		}
		tryRevokeUrl(_lastDebug.canvasSnapshotUrl);
		_lastDebug.rows.forEach(r => tryRevokeUrl(r.rectSnapshotUrl));
	}
	return _lastDebug = /** @type {OCRDebugReport} */({
		outcome: 'error',
		timestampISO: new Date().toISOString(),
		teamMode: false,
		canvasWidth: 0,
		canvasHeight: 0,
		canvasSnapshotUrl: null,
		whitelist: '',
		levCosts: { ins: 0, del: 0, sub: 0 },
		maxEditDistance: 0,
		maxNonBlankCost: 0,
		blankCost: 0,
		ignMismatchPenalty: 0,
		rows: [],
		costMatrix: [],
		assignment: [],
		finalPlacements: [],
		errorMessage: undefined
	});
}

/**
 * Build row rectangles from simple parameters
 * @param {{count:number,startY:number,rowHeight:number,vPad:number,x:number,w:number}} p
 * @returns {Rect[]}
 */
function generateRowRects(p) {
	const rects = [];
	for (let i = 0; i < p.count; i++) {
		rects.push({
			x: p.x,
			y: Math.round(p.startY + i * p.rowHeight) + p.vPad,
			w: p.w,
			h: p.rowHeight - 2 * p.vPad
		});
	}
	return rects;
}
export const OCR_GRID = {
	canvasWidth: 1920,
	canvasHeight: 1080,
	nameRects: generateRowRects({ count: 12, startY: 40, rowHeight: 77, vPad: 15, x: 1270, w: 340 }),
	pauseRects: [
		...generateRowRects({ count: 6, startY: 90, rowHeight: 76, vPad: 15, x: 260, w: 240 }),
		...generateRowRects({ count: 6, startY: 90, rowHeight: 76, vPad: 15, x: 670, w: 240 }),
	]
};

/**
 * Directional, weighted edit distance from a -> b.
 * Costs are integers (keeps the assignment DP happy).
 * @param {string} a
 * @param {string} b
 * @param {{ins:number, del:number, sub:number}} w
 */
function levenshteinWeighted(a, b, w = { ins: 1, del: 1, sub: 1 }) {
	if (a === b) return 0;
	const al = a.length, bl = b.length;
	if (!al) return bl * w.ins;
	if (!bl) return al * w.del;

	const v0 = new Array(bl + 1);
	const v1 = new Array(bl + 1);
	for (let j = 0; j <= bl; j++) v0[j] = j * w.ins;

	for (let i = 0; i < al; i++) {
		v1[0] = (i + 1) * w.del;
		const ca = a.charCodeAt(i);
		for (let j = 0; j < bl; j++) {
			const cb = b.charCodeAt(j);
			const costSub = ca === cb ? 0 : w.sub;
			v1[j + 1] = Math.min(
				v1[j] + w.ins,        // insert into a (extra char in b)
				v0[j + 1] + w.del,    // delete from a
				v0[j] + costSub       // substitute / match
			);
		}
		for (let j = 0; j <= bl; j++) v0[j] = v1[j];
	}
	return v1[bl];
}

/**
 * Solve the assignment (player i -> row j) minimizing total integer costs.
 * @param {number[][]} cost - NxN matrix where cost[i][j] is the cost to map player i to row j
 * @returns {number[]} assignment array A of length N where A[i] = j (row index for player i)
 */
function solveAssignmentDP(cost) {
	const n = cost.length, SIZE = 1 << n;
	/** @type {number[]} */ const dp = new Array(SIZE).fill(Infinity);
	/** @type {number[]} */ const parent = new Array(SIZE).fill(-1);
	/** @type {number[]} */ const choice = new Array(SIZE).fill(-1);
	dp[0] = 0;

	for (let mask = 0; mask < SIZE; mask++) {
		const i = popcount(mask);                 // next player index
		if (i >= n) continue;
		const base = dp[mask] ?? NaN;
		for (let j = 0; j < n; j++) {
			if (mask & (1 << j)) continue;          // row j already used
			const cell = cost[i]?.[j] ?? NaN;
			const m2 = mask | (1 << j);
			const val = base + cell;
			if (val < (dp[m2] ?? NaN)) {
				dp[m2] = val;
				parent[m2] = mask;
				choice[m2] = j;
			}
		}
	}

	// reconstruct
	const assign = new Array(n).fill(-1);
	let mask = SIZE - 1;
	for (let i = n - 1; i >= 0; i--) {
		const j = choice[mask];
		assign[i] = j;
		mask = parent[mask] ?? NaN;
	}
	return assign;
}

/** @type {Promise<any>|null} */
let _worker = null;
function getWorker() {
	return _worker ??= Tesseract.createWorker('eng', 1, { logger: () => { } }, { load_system_dawg: 'F', load_freq_dawg: 'F' });
}

/** Load the OCR engine ahead of time, so the first capture isn't held up by it */
export function preloadOcr() {
	return getWorker();
}

const scratch = document.createElement('canvas');

/**
 * Core API — kicks off capture, OCR, fuzzy match, optional manual resolve, then resolves placements.
 * @param {HTMLCanvasElement} canvas
 * @param {Rect[]} nameRects
 * @param {Roster} roster
 * @param {boolean} teamMode
 * @param {Object} [options]
 * @param {boolean} [options.resultsScreen] the picture is known to be the results screen: names that can't be read don't make it "no scoreboard"
 * @param {(count:number) => void} [options.onAskUser] called before asking the user to match players
 * @param {NamePictures} [options.namePictures] to recognise names that can't be read by how they looked before
 * @param {(count:number) => void} [options.onMatchedByLooks] called when names were recognised that way
 * @returns {Promise<Placement[]>}
 */
export async function processResultsScreen(canvas, nameRects, roster, teamMode=false, { resultsScreen = false, onAskUser, namePictures, onMatchedByLooks } = {}) {
	const dbg = isDebugMode() ? startNewDebugReport() : null;
	const whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -',
		levCosts = { ins: 3, del: 1, sub: 2 },
		maxEditDistance = 10;
	if( dbg ) {
		dbg.teamMode = teamMode;
		dbg.canvasWidth = canvas.width;
		dbg.canvasHeight = canvas.height;
		dbg.canvasSnapshotUrl = await snapshotBlobUrlFromCanvas(canvas);
		dbg.whitelist = whitelist;
		dbg.levCosts = levCosts;
		dbg.maxEditDistance = maxEditDistance;
	}

	const worker = await getWorker();
	await worker.setParameters({
		tessedit_char_whitelist: whitelist,
		preserve_interword_spaces: '1',
		tessedit_do_invert: '1',
		textord_heavy_nr: '0',
		tessedit_pageseg_mode: '6' // SINGLE_BLOCK
	});

	/** @type {{ text:string, confidence:number, hasText:boolean }[]} */
	const rawRows = [];
	/** @type {(Uint8Array|null)[]} each row's name as a picture, for recognising it by looks */
	const rowBits = nameRects.map(() => null);
	for ( let idx = 0; idx < nameRects.length; idx++ ) {
		const rect = nameRects[idx];
		const { canvas: img, whiteRatio } = preprocessCrop(canvas, rect, 1, scratch, teamMode);
		if (whiteRatio < 0.01 || whiteRatio > 0.3) {
			// nothing found, skip
			rawRows.push({ text: '', confidence: 0, hasText: false });
			if( dbg ) dbg.rows.push({
				idx, rect, whiteRatio,
				rectSnapshotUrl: await snapshotBlobUrlFromCanvas(img),
				ocrText: '', confidence: 0,
				normalized: '', wasBlank: true,
				assignedTo: null, assignedDistance: 0,
				disconnected: true, revokedAssign: false
			});
			continue;
		}
		rowBits[idx] = toBits(img);
		// a data URL: a canvas would be turned into a blob, which the browser holds up while the page is in the background
		const { data } = await worker.recognize(img.toDataURL());
		const best = (data?.text ?? '').replace(/\s+/g, ' ').trim();
		const conf = (data && Number.isFinite(data.confidence)) ? data.confidence : 0;
		rawRows.push({ text: best, confidence: conf, hasText: true });
		if( dbg ) dbg.rows.push({
			idx, rect, whiteRatio,
			rectSnapshotUrl: await snapshotBlobUrlFromCanvas(img),
			ocrText: best, confidence: Math.round(conf),
			normalized: normalizeName(best), wasBlank: false,
			assignedTo: null, assignedDistance: 0,
			disconnected: false, revokedAssign: false
		});
	}

	// Prepare normalized data
	const rosterArray = [...roster];
	const placements = rawRows.map((row, i) => new Placement(i + 1, null, row.text, row.text, Math.round(row.confidence), false));
	const normRows = rawRows.map(r => normalizeName(r.text));

	// Early exit if 3+ blanks (on what's known to be the results screen, only rows with nothing on them count)
	const blanks = resultsScreen ? rawRows.filter(r => !r.hasText).length : normRows.filter(s => !s).length;
	if (blanks > 2) {
		if( dbg ) dbg.outcome = 'no_scoreboard';
		const err = new Error('No scoreboard detected');
		// @ts-ignore add a code for easy identification
		err.code = 'NO_SCOREBOARD';
		throw err;
	}

	// Build an integer cost matrix: players (rows) × OCR rows (cols)
	const N = rosterArray.length; // expect 12
	const isBlankCol = normRows.map(s => !s);

	// Use IGN if available, else roster name, for each player
	const targetNorm = rosterArray.map(p => normalizeName(p.activePlayer.ign));

	/** @type {number[][]} */
	const cost = Array.from({ length: N }, () => Array(N).fill(0));

	let maxNonBlankCost = 0;
	// Pass 1: fill non-blank base costs and track the maximum seen
	for (let i = 0; i < N; i++) {
		for (let j = 0; j < N; j++) {
			if (isBlankCol[j]) continue;
			const d = levenshteinWeighted(targetNorm[i], normRows[j], levCosts);
			cost[i][j] = d;
			if (d > maxNonBlankCost) maxNonBlankCost = d;
		}
	}
	if( dbg ) dbg.maxNonBlankCost = maxNonBlankCost;

	// Choose penalties
	const BLANK_COST = maxNonBlankCost + 2;        // blanks are strictly worse than any non-blank match
	const IGN_MISMATCH_PENALTY = maxNonBlankCost + 50; // big stick for stealing someone else's IGN
	if( dbg ) {
		dbg.blankCost = BLANK_COST;
		dbg.ignMismatchPenalty = IGN_MISMATCH_PENALTY;
	}

	// Pass 2: assign blank costs
	for (let i = 0; i < N; i++) {
		for (let j = 0; j < N; j++) {
			if (isBlankCol[j]) cost[i][j] = BLANK_COST;
		}
	}

	// Pass 3: if a row exactly matches a known IGN, heavily penalize assigning it to anyone else.
	for (let j = 0; j < N; j++) {
		if (isBlankCol[j]) continue;
		const owner = targetNorm.indexOf(normRows[j]);
		if (owner < 0) continue;
		for (let i = 0; i < N; i++) {
			if (i === owner) continue;
			cost[i][j] += IGN_MISMATCH_PENALTY;
		}
	}
	if( dbg ) dbg.costMatrix = cost.map(row=>[...row]); // deep copy to preserve original state

	// Solve globally: which OCR row should each player map to?
	const assign = solveAssignmentDP(cost);
	if( dbg ) dbg.assignment = [...assign];

	// Apply assignment (invert to fill per-row placements) and record distances
	/** @type {number[]} */ const assignedDist = new Array(N).fill(0);
	for (let i = 0; i < N; i++) {
		const j = assign[i];
		placements[j] = placements[j].withPlayerIdAndResolvedName(rosterArray[i].id, rosterArray[i].activePlayer.name);
		assignedDist[j] = cost[i][j];
		if( dbg && dbg.rows[j] ) {
			dbg.rows[j].assignedTo = rosterArray[i].id;
			dbg.rows[j].assignedDistance = assignedDist[j];
		}
	}

	// A row with a name on it that couldn't be read isn't a disconnect; and with one of those in the race,
	// who disconnected can't be worked out by elimination either
	const unreadable = normRows.map((s, j) => !s && rawRows[j].hasText);
	const anyUnreadable = unreadable.some(Boolean);

	// Ambiguity handling:
	//  - Mark blank rows as disconnected
	//  - Ask who unreadable rows are (and, if there are any, who disconnected)
	//  - If a row has *non-blank* OCR and its assigned distance exceeds maxEditDistance, revoke assignment
	for (let j = 0; j < N; j++) {
		const isBlank = !normRows[j];
		if (isBlank) {
			if (!unreadable[j]) placements[j] = placements[j].withPlacement(placements[j].placement, true);
			if (anyUnreadable) placements[j] = placements[j].withPlayerIdAndResolvedName(null, placements[j].ocrText);
			if( dbg && dbg.rows[j] ) {
				dbg.rows[j].disconnected = !unreadable[j];
				dbg.rows[j].revokedAssign = anyUnreadable;
			}
		}
		else if (assignedDist[j] > maxEditDistance) {
			placements[j] = placements[j].withPlayerIdAndResolvedName(null, placements[j].ocrText);
			if( dbg && dbg.rows[j] ) dbg.rows[j].revokedAssign = true;
		}
	}

	// Names that couldn't be matched by reading them: compare how they look with the remaining players' names in earlier races
	if (namePictures && placements.some(p => !p.playerId)) {
		const matched = await matchByLooks(placements, rowBits, rosterArray, namePictures, nameRects[0]);
		if (matched) onMatchedByLooks?.(matched);
	}

	// If anything is unresolved, open the manual resolver with the remaining players
	if (placements.some(p => !p.playerId)) {
		const remaining = rosterArray.filter(p => !placements.some(r => r.playerId === p.id));
		if (remaining.length === 1) {
			// One mismatch: just auto-assign it
			const missingIndex = placements.findIndex(p => !p.playerId);
			placements[missingIndex] = placements[missingIndex].withPlayerIdAndResolvedName(remaining[0].id, remaining[0].activePlayer.name);
		}
		else {
			onAskUser?.(remaining.length);
			const confirmed = await manualResolve(placements, remaining);
			if (!confirmed) {
				if( dbg ) dbg.outcome = 'manual_cancelled';
				const err = new Error('Manual resolve canceled');
				// @ts-ignore add a code for easy identification
				err.code = 'MANUAL_CANCELLED';
				throw err;
			}
		}
	}

	if( dbg ) {
		dbg.outcome = 'success';
		dbg.finalPlacements = placements.map((p,row) => ({place: row+1, playerId: p.playerId, resolvedName: p.resolvedName}));
	}

	return placements;
}

/**
 * Pictures of players' names from earlier races, by player ID.
 * @typedef {(playerIds: string[]) => Promise<Map<string, Uint8Array>>} NamePictures
 */

/** How alike two pictures of the same name are, at least; different names stay well below */
const LOOKS_SAME = 0.6;
/** How much more alike the best match must be than the next best */
const LOOKS_MARGIN = 0.12;

const bitsScratch = document.createElement('canvas');
/**
 * A name row as a black and white picture (1 = text), the way it's prepared for OCR.
 * @param {HTMLCanvasElement} canvas
 * @param {Rect} rect
 * @param {boolean} teamMode
 * @returns {Uint8Array|null} null if the row is empty
 */
export function nameBits(canvas, rect, teamMode) {
	const { canvas: img, whiteRatio } = preprocessCrop(canvas, rect, 1, bitsScratch, teamMode);
	return whiteRatio < 0.01 || whiteRatio > 0.3 ? null : toBits(img);
}

/** @param {HTMLCanvasElement} img a thresholded crop */
function toBits(img) {
	const { data } = ctx2d(img, { willReadFrequently: true }).getImageData(0, 0, img.width, img.height);
	const bits = new Uint8Array(img.width * img.height);
	for (let i = 0; i < bits.length; i++) bits[i] = data[i * 4] === 255 ? 1 : 0;
	return bits;
}

/**
 * How alike two name pictures are (overlap of their text, 1 = identical), allowing them to be a few pixels apart.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {number} w
 * @param {number} h
 */
function nameLikeness(a, b, w, h) {
	let best = 0;
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -4; dx <= 4; dx++) {
			let both = 0, either = 0;
			for (let y = Math.max(0, -dy); y < Math.min(h, h - dy); y++) {
				const ra = y * w, rb = (y + dy) * w;
				for (let x = Math.max(0, -dx); x < Math.min(w, w - dx); x++) {
					const va = a[ra + x] ?? 0, vb = b[rb + x + dx] ?? 0;
					both += va & vb;
					either += va | vb;
				}
			}
			if (either && both / either > best) best = both / either;
		}
	}
	return best;
}

/**
 * Match rows nobody could be matched to by reading them, by how the remaining players' names looked in earlier races.
 * Works for names OCR can't read at all, like ones in Japanese.
 * @param {Placement[]} placements updated in place
 * @param {(Uint8Array|null)[]} rowBits
 * @param {Player[]} players
 * @param {NamePictures} namePictures
 * @param {Rect} rect size of a name row
 * @returns {Promise<number>} how many rows were matched
 */
async function matchByLooks(placements, rowBits, players, namePictures, rect) {
	const rows = placements.flatMap((p, j) => !p.playerId && !p.dc && rowBits[j] ? [j] : []);
	const remaining = players.filter(p => !placements.some(r => r.playerId === p.id));
	if (!rows.length || !remaining.length) return 0;
	const pictures = await namePictures(remaining.map(p => p.id));

	/** @type {{row:number, player:Player, likeness:number}[]} */
	const found = [];
	for (const row of rows) {
		const bits = /** @type {Uint8Array} */(rowBits[row]);
		const scores = remaining
			.map(player => ({ player, likeness: pictures.has(player.id) ? nameLikeness(bits, /** @type {Uint8Array} */(pictures.get(player.id)), rect.w, rect.h) : 0 }))
			.sort((x, y) => y.likeness - x.likeness);
		const [best, next] = scores;
		if (best && best.likeness >= LOOKS_SAME && best.likeness - (next?.likeness ?? 0) >= LOOKS_MARGIN) found.push({ row, ...best });
	}
	// surest first; each player only once
	found.sort((x, y) => y.likeness - x.likeness);
	const used = new Set();
	for (const { row, player } of found) {
		if (used.has(player.id)) continue;
		used.add(player.id);
		placements[row] = placements[row].withPlayerIdAndResolvedName(player.id, player.activePlayer.name);
	}
	return used.size;
}
