/** @typedef {import("../mogi.js").Mogi} Mogi */
/** @typedef {import("../autocapture.js").PointsColumnScan} PointsColumnScan */

import { checkOverlay, countPointsLabels, countRedoPlayers, MIN_POINTS_ROWS, MIN_REDO_ROWS, preloadResultsDetection, scanPointsColumn, scanSimilarity } from "../autocapture.js";
import { captureFrame, captureResultsScreen, noteRedoRace } from "../capture.js";
import { t } from "../i18n/i18n.js";
import { Config } from "../util.js";
import { info, warning } from "./toast.js";

const configKey = 'autoCapture';

/** Overlap of the points column between polls before capturing; video noise alone stays above ~0.8, a 3px move drops below ~0.65 */
const STABLE_SIMILARITY = 0.7;
/** With fewer than 12 rows, wait this long in case the remaining players are still being added */
const WAIT_FOR_MISSING_ROWS_MS = 2000;
/** The results screen must be gone this long before the next one can be captured */
const REARM_AFTER_MS = 3000;
/** Pause after a failed attempt on the same screen */
const RETRY_DELAY_MS = 1000;
/** Failed attempts on one screen before giving up and telling the user */
const MAX_ATTEMPTS = 3;
/** Polls in a row the Switch screenshot icon must be visible for */
const SCREENSHOT_HITS = 3;
/** No race (with intro) is shorter than this, so a second capture this soon is the same race again */
const MIN_RACE_GAP_MS = 30000;
/** A results screen with too few players must stay up this long before it's taken for a redo (rows can still be sliding in) */
const REDO_CONFIRM_MS = 5000;
/** Being in the background longer than this is worth a note in the log */
const HIDDEN_WARNING_MS = 15000;

/**
 * Modes: 'off', 'on' (when a Switch screenshot is taken), 'results' (when the results screen appears),
 * 'both' (when the results screen appears, or when a Switch screenshot is taken in case it wasn't recognised)
 * @param {HTMLSelectElement} select
 * @param {HTMLButtonElement} captureButton
 * @param {HTMLVideoElement} video
 * @param {Mogi} mogi
 */
export function setupAutoCapture(select, captureButton, video, mogi) {
	let interval = 0;

	function pollForScreenshot() {
		let hits = 0;
		let busy = false;
		let cooldown = false;
		return async () => {
			if( mogi.ended || busy || cooldown ) return;
			// only sightings in a row count, so the odd false one doesn't add up over a mogi
			hits = checkOverlay(video) ? hits + 1 : 0;
			if( hits < SCREENSHOT_HITS ) return;
			hits = 0;
			// the icon stays up for a few seconds; don't take it for a second screenshot
			cooldown = true;
			setTimeout(() => cooldown = false, 5000);
			busy = true;
			try { await captureResultsScreen(video, mogi, { source: 'screenshot' }); }
			finally { busy = false; }
		};
	}

	/** @param {boolean} withScreenshots also capture when a Switch screenshot is taken */
	function pollForResultsScreen(withScreenshots) {
		const frameBuffer = document.createElement('canvas');
		let busy = false;
		let armed = true;
		let attempts = 0;
		let lastSeenAt = 0;
		let stableSince = 0;
		let retryAt = 0;
		let lastCapturedAt = -Infinity;
		let screenshotHits = 0;
		/** @type {PointsColumnScan|null} */
		let prev = null;
		let redoRows = 0, redoSince = 0, redoLastSeen = 0, redoNoted = false;

		/**
		 * @param {boolean} quiet
		 * @param {import("../capture.js").CaptureSource} source
		 */
		async function capture(quiet, source) {
			const result = await captureResultsScreen(video, mogi, { quiet, source });
			if( result === 'ok' ) lastCapturedAt = performance.now();
			// the manual resolve dialog may have been open for a while
			lastSeenAt = performance.now();
			return result;
		}

		/**
		 * A results screen with too few players is a race that gets redone: note it once
		 * @param {PointsColumnScan} scan
		 * @param {HTMLCanvasElement} frame
		 * @param {number} now
		 */
		async function watchForRedo(scan, frame, now) {
			if( scan.rows < MIN_REDO_ROWS ) {
				redoSince = 0;
				if( now - redoLastSeen > REARM_AFTER_MS ) redoNoted = false;
				return;
			}
			redoLastSeen = now;
			if( redoNoted ) return;
			if( !redoSince || scan.rows !== redoRows ) {
				redoSince = now;
				redoRows = scan.rows;
				return;
			}
			if( now - redoSince < REDO_CONFIRM_MS ) return;
			const players = await countRedoPlayers(frame, scan);
			if( players ) {
				redoNoted = true;
				noteRedoRace(mogi, players);
			}
			else redoSince = performance.now(); // not one after all; look again in a while
		}

		async function poll() {
			const now = performance.now();
			const frame = captureFrame(video, frameBuffer);

			// A Switch screenshot captures straight away, unless this race is already in
			screenshotHits = withScreenshots && checkOverlay(frame) ? screenshotHits + 1 : 0;
			if( screenshotHits === SCREENSHOT_HITS ) {
				if( now - lastCapturedAt < MIN_RACE_GAP_MS ) {
					info(t('capture.alreadyCaptured'));
					mogi.addLog({ level: 'info', race: mogi.size, key: 'screenshotIgnored' });
					return;
				}
				const result = await capture(false, 'screenshot');
				// don't let the results screen detection capture (or ask about) this screen again
				if( result === 'ok' || result === 'cancelled' ) armed = false;
				return;
			}

			const scan = scanPointsColumn(frame);
			if( scan.rows < MIN_POINTS_ROWS ) {
				prev = null;
				await watchForRedo(scan, frame, now);
				if( !armed && now - lastSeenAt > REARM_AFTER_MS ) {
					armed = true;
					attempts = 0;
				}
				return;
			}
			lastSeenAt = now;
			if( !armed || now < retryAt || now - lastCapturedAt < MIN_RACE_GAP_MS ) return;

			// wait for the rows to stop animating before reading them
			const stable = prev && scanSimilarity(prev.bits, scan.bits) >= STABLE_SIMILARITY;
			if( !stable || scan.rows !== prev?.rows ) stableSince = now;
			prev = scan;
			if( !stable ) return;
			if( scan.rows < 12 && now - stableSince < WAIT_FOR_MISSING_ROWS_MS ) return;

			if( await countPointsLabels(scan) < MIN_POINTS_ROWS ) {
				// looked like it from a distance, but it's not the results screen
				retryAt = performance.now() + RETRY_DELAY_MS;
				return;
			}
			attempts++;
			const result = await capture(attempts < MAX_ATTEMPTS, 'auto');
			if( result === 'no_scoreboard' && attempts < MAX_ATTEMPTS ) {
				retryAt = performance.now() + RETRY_DELAY_MS;
				return;
			}
			// captured, cancelled by the user, or failed for good: leave this screen alone
			armed = false;
		}

		return async () => {
			if( mogi.ended || busy ) return;
			busy = true;
			try { await poll(); }
			finally { busy = false; }
		};
	}

	/** @param {string} mode */
	function setMode(mode) {
		clearInterval(interval);
		interval = 0;
		if( mode === 'on' ) interval = setInterval(pollForScreenshot(), 200);
		if( mode === 'results' || mode === 'both' ) {
			interval = setInterval(pollForResultsScreen(mode === 'both'), 250);
			preloadResultsDetection().catch(err => console.error('Could not load OCR', err));
		}
		captureButton.disabled = mode !== 'off';
		Config.set(configKey, mode);
	}

	// Browsers slow pages down in the background (including a window that's completely covered),
	// so auto-capture can miss a results screen then; make that visible
	let hiddenSince = 0;
	document.addEventListener('visibilitychange', () => {
		if( document.hidden ) {
			hiddenSince = performance.now();
			return;
		}
		const hiddenFor = performance.now() - hiddenSince;
		if( hiddenSince && interval && !mogi.ended && hiddenFor > HIDDEN_WARNING_MS ) {
			const seconds = Math.round(hiddenFor / 1000);
			const duration = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
			mogi.addLog({ level: 'warning', race: null, key: 'tabHidden', vars: { duration } });
			warning(t('log.tabHidden', { duration }), { timeout: 10000 });
		}
		hiddenSince = 0;
	});

	const saved = Config.get(configKey, 'off');
	select.value = [...select.options].some(o => o.value === saved) ? saved : 'off';
	setMode(select.value);
	select.addEventListener('change', () => setMode(select.value));
}
