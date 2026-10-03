/** @typedef {import("./mogi.js").Mogi} Mogi */

import { countRedoPlayers, MIN_POINTS_ROWS, readGameScores, scanPointsColumn } from "./autocapture.js";
import { t } from "./i18n/i18n.js";
import { nameBits, OCR_GRID, processResultsScreen } from "./ocr.js";
import { Race } from "./race.js";
import { checkTotals, gameRaceCount, redoBefore } from "./totals-check.js";
import { attention, playComplete, playSaved } from "./ui/alerts.js";
import { formatLogEntry } from "./ui/mogi-log.js";
import { error, info, success } from "./ui/toast.js";
import { ctx2d, rgb2hsv } from "./util.js";

/** @typedef {import("./player.js").Substitute} Substitute */

/**
 * Capture a single frame from a video element into a canvas.
 * @param {HTMLVideoElement} videoEl
 * @param {HTMLCanvasElement} [canvas]
 * @returns {HTMLCanvasElement} The given canvas, or a new one
 */
export function captureFrame(videoEl, canvas=document.createElement('canvas')) {
	const { canvasWidth: w, canvasHeight: h } = OCR_GRID;
	canvas.width = w; canvas.height = h;
	const ctx = ctx2d(canvas, { willReadFrequently: true });
	const vidW = videoEl.videoWidth, vidH = videoEl.videoHeight;
	if (!vidW || !vidH) return canvas; // video not loaded, return empty frame
	const scale = Math.min(vidW / w, vidH / h);
	const sx = Math.floor((vidW - w * scale) / 2), sy = Math.floor((vidH - h * scale) / 2);
	const sW = Math.floor(w * scale), sH = Math.floor(h * scale);
	ctx.drawImage(videoEl, sx, sy, sW, sH, 0, 0, w, h);
	return canvas;
}

/**
 * Lightweight pre-processing (scale, grayscale + threshold).
 * @param {HTMLCanvasElement} src
 * @param {{x:number,y:number,w:number,h:number}} r
 * @param {number} [scale]
 * @param {HTMLCanvasElement} [scratch]
 * @param {boolean} [useHueBasedThreshold] Use hue to determine threshold
 */
export function preprocessCrop(src, r, scale=1, scratch=document.createElement('canvas'), useHueBasedThreshold=false) {
	scratch.width = r.w * scale; scratch.height = r.h * scale;
	const pctx = ctx2d(scratch, { willReadFrequently: true });
	pctx.imageSmoothingEnabled = false;
	pctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w * scale, r.h * scale);

	const img = pctx.getImageData(0, 0, scratch.width, scratch.height);
	const [hue] = rgb2hsv(img.data[0], img.data[1], img.data[2]);
	const lowerThreshold = useHueBasedThreshold ? (
		hue < 25 ? 70 : // red team
		hue < 50 ? 120 : // yellow team
		hue < 200 ? 80 : // green team
		hue < 300 ? 50 : // blue team
		70 // red team again
	) : 0;
	const upperThreshold = 240; // aggressive threshold for white
	let whitePixels = 0;
	for (let i = 0; i < img.data.length; i += 4) {
		const r0 = img.data[i] ?? 0, g0 = img.data[i + 1] ?? 0, b0 = img.data[i + 2] ?? 0;
		const y0 = (r0 * 299 + g0 * 587 + b0 * 114) / 1000;
		const v = y0 < lowerThreshold || y0 > upperThreshold ? 255 : 0;
		img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
		if (v === 255) whitePixels++;
	}
	const whiteRatio = whitePixels / (scratch.width * scratch.height);
	pctx.putImageData(img, 0, 0);
	return { canvas: scratch, whiteRatio };
}

/**
 * Turn a pre-captured canvas into a Blob URL.
 * Not with toBlob: the browser can hold that up for a long time while the page is in the background.
 * @param {HTMLCanvasElement} base
 * @returns {Promise<string>}
 */
export async function snapshotBlobUrlFromCanvas(base) {
	const blob = await (await fetch(base.toDataURL('image/jpeg', 0.85))).blob();
	return URL.createObjectURL(blob);
}

/** A capture is running (the Capture button and auto-capture can both start one) */
let capturing = false;

/** @type {Record<CaptureSource, string>} */
const SAVED_LOG_KEYS = { auto: 'savedAuto', screenshot: 'savedScreenshot', manual: 'savedManual', recovered: 'savedRecovered' };

/**
 * Capture a frame and OCR the results screen.
 * @typedef {'auto'|'screenshot'|'manual'|'recovered'} CaptureSource what triggered the capture
 * @param {HTMLVideoElement} video
 * @param {Mogi} mogi
 * @param {Object} [options]
 * @param {boolean} [options.quiet] don't warn when no scoreboard is found (the caller will retry)
 * @param {CaptureSource} [options.source]
 * @param {HTMLCanvasElement} [options.frame] read this picture rather than the camera's current one
 * @returns {Promise<'ok'|'cancelled'|'no_scoreboard'|'redo'|'error'|'busy'>} busy: another capture was still running
 */
export async function captureResultsScreen(video, mogi, { quiet = false, source = 'manual', frame } = {}) {
	if( capturing ) return 'busy';
	capturing = true;
	const raceNumber = mogi.size + 1;
	/** @type {HTMLCanvasElement|null} */
	let base = null;
	try {
		base = frame ?? captureFrame(video);
		const teamMode = mogi.playersPerTeam >= 3;
		// The "+N" column is only on the results screen, not on the standings that come after it
		const isResultsScreen = scanPointsColumn(base).rows >= MIN_POINTS_ROWS;
		// this may throw MANUAL_CANCELLED or NO_SCOREBOARD
		const placements = await processResultsScreen(base, OCR_GRID.nameRects, mogi.roster, teamMode, {
			resultsScreen: isResultsScreen,
			onAskUser: count => attention(mogi, { level: 'warning', race: raceNumber, key: 'askedToMatch', vars: { count } }),
			namePictures: namePicturesFrom(mogi, teamMode),
			onMatchedByLooks: count => mogi.addLog({ level: 'info', race: raceNumber, key: count === 1 ? 'matchedByLooksOne' : 'matchedByLooks', vars: { count } })
		});
		// Only if successful, make the snapshot and push the race
		const snapshotUrl = await snapshotBlobUrlFromCanvas(base);
		const gameScores = isResultsScreen ? await readGameScores(base).catch(err => { console.error(err); return []; }) : [];
		const race = new Race(Date.now(), placements, snapshotUrl, gameScores);
		mogi.roster.lockIGNsFromPlacements(placements);
		mogi.addRace(race);
		mogi.addLog({ level: 'success', race: raceNumber, key: SAVED_LOG_KEYS[source] });
		playSaved();
		if( isResultsScreen ) reportTotals(mogi, mogi.size - 1);
		else attention(mogi, { level: 'warning', race: raceNumber, key: 'notResultsScreen' });
		if( mogi.ended ) {
			mogi.addLog({ level: 'success', race: null, key: 'mogiComplete' });
			success(t('log.mogiComplete'), { timeout: 15000 });
			playComplete();
		}
		return 'ok';
	} catch (e) {
		// If the user canceled manual resolve, just abort quietly
		if (/** @type {any} */(e)?.code === 'MANUAL_CANCELLED') {
			console.log('Capture canceled by user.');
			info(t('capture.captureCancelled'));
			mogi.addLog({ level: 'info', race: raceNumber, key: 'matchCancelled' });
			return 'cancelled';
		}
		// If no scoreboard found, warn the user
		if (/** @type {any} */(e)?.code === 'NO_SCOREBOARD') {
			console.log('No scoreboard detected in frame.');
			// too few players for the race to count isn't a failure to read it
			const players = base ? await countRedoPlayers(base).catch(() => 0) : 0;
			if( players ) {
				noteRedoRace(mogi, players);
				return 'redo';
			}
			if( !quiet) attention(mogi, { level: 'error', race: raceNumber, key: 'noScoreboard' });
			return 'no_scoreboard';
		}
		// Otherwise, surface the error
		console.error(e);
		attention(mogi, { level: 'error', race: raceNumber, key: 'ocrFailed' });
		return 'error';
	}
	finally {
		capturing = false;
	}
}

/**
 * How each player's name looked in the last race they were in, so names that can't be read can still be recognised.
 * @param {Mogi} mogi
 * @param {boolean} teamMode
 * @returns {import("./ocr.js").NamePictures}
 */
function namePicturesFrom(mogi, teamMode) {
	/** @type {Map<number, Promise<HTMLCanvasElement>>} the races' screenshots, by race */
	const frames = new Map();
	/** @param {Race} race */
	const frameOf = race => {
		let frame = frames.get(race.timestamp);
		if (!frame) frames.set(race.timestamp, frame = (async () => {
			// not an <img>: those don't get decoded while the page is in the background
			const img = await createImageBitmap(await (await fetch(race.snapshotUrl)).blob());
			const canvas = document.createElement('canvas');
			canvas.width = OCR_GRID.canvasWidth;
			canvas.height = OCR_GRID.canvasHeight;
			ctx2d(canvas, { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
			return canvas;
		})());
		return frame;
	};
	return async playerIds => {
		/** @type {Map<string, Uint8Array>} */
		const pictures = new Map();
		for (const id of playerIds) {
			const player = mogi.roster.byId(id);
			if (!player) continue;
			// a substitute's name only shows in the races since they joined
			const since = player.activePlayer === player ? 0 : /** @type {Substitute} */(player.activePlayer).joinedAt;
			const race = mogi.races.slice(since).findLast(r => r.placements.some(p => p.playerId === id && !p.dc));
			const place = race?.placements.find(p => p.playerId === id)?.placement;
			if (!race || !place) continue;
			try {
				const bits = nameBits(await frameOf(race), /** @type {import("./ocr.js").Rect} */(OCR_GRID.nameRects[place - 1]), teamMode);
				if (bits) pictures.set(id, bits);
			}
			catch (err) {
				console.warn('Could not use an earlier screenshot', err);
			}
		}
		return pictures;
	};
}

/**
 * A race with too few players gets redone, so it isn't recorded; note it, so the totals after it make sense.
 * @param {Mogi} mogi
 * @param {number} players
 */
export function noteRedoRace(mogi, players) {
	/** @type {Omit<import("./mogi.js").LogEntry, 'time'>} */
	const entry = { level: 'info', race: mogi.size + 1, key: 'redoRace', vars: { count: players } };
	mogi.addLog(entry);
	info(formatLogEntry(entry), { timeout: 10000 });
}

/**
 * Compare the totals the game showed on a race's results screen with the races recorded before it.
 * @param {Mogi} mogi
 * @param {number} index
 */
function reportTotals(mogi, index) {
	const check = checkTotals(mogi, index);
	const race = index + 1;
	const afterRedo = redoBefore(mogi, race);
	if( check.result === 'ok' ) mogi.addLog({ level: 'success', race, key: 'totalsOk' });
	else if( check.result === 'unknown' ) mogi.addLog({ level: 'info', race, key: 'totalsUnknown' });
	else if( check.result === 'missed' && afterRedo ) mogi.addLog({ level: 'info', race, key: 'totalsAfterRedo' });
	else {
		const details = check.mismatches.slice(0, 3).map(m => t('log.totalsDetail', m)).join('; ');
		const races = check.from === check.to ? t('log.raceRef', { number: check.to }) : t('log.raceRange', { from: check.from, to: check.to });
		attention(mogi, { level: 'warning', race, key: check.result === 'missed' ? 'totalsMissed' : 'totalsWrong', vars: { races, details } });
	}

	// The game's totals also tell how many races it has counted: more than are recorded here means some are missing
	const redos = mogi.log.filter(e => e.key === 'redoRace' || e.key === 'markedRedo').length;
	const counted = gameRaceCount(mogi.races[index]);
	const missing = counted - mogi.size - redos;
	const alreadySaid = mogi.log.findLast(e => e.key === 'racesMissing')?.vars?.['missing'];
	if( missing > 0 && missing !== alreadySaid ) {
		attention(mogi, { level: 'warning', race, key: 'racesMissing', vars: { counted, recorded: mogi.size, missing } });
	}
}

/**
 * Capture pause menu player list.
 * @param {HTMLVideoElement} video
 * @param {Mogi} mogi
 */
export async function capturePauseScreen(video, mogi) {
	try {
		const base = captureFrame(video);
		// this may throw MANUAL_CANCELLED or NO_SCOREBOARD
		const placements = await processResultsScreen(base, OCR_GRID.pauseRects, mogi.roster);
		return placements;
	} catch (e) {
		// If the user canceled manual resolve, just abort quietly
		if (/** @type {any} */(e)?.code === 'MANUAL_CANCELLED') {
			console.log('Capture canceled by user.');
			info(t('capture.captureCancelled'));
			return;
		}
		// If no scoreboard found, warn the user
		if (/** @type {any} */(e)?.code === 'NO_SCOREBOARD') {
			console.log('No scoreboard detected in frame.');
			error(t('capture.noPauseScreenDetected'));
			return;
		}
		// Otherwise, surface the error
		console.error(e);
		error(t('capture.ocrFailed'));
		return;
	}
}
