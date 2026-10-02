/** @typedef {import("../mogi.js").Mogi} Mogi */
/** @typedef {import("../autocapture.js").PointsColumnScan} PointsColumnScan */

import { checkOverlay, countPointsLabels, preloadResultsDetection, scanPointsColumn, scanSimilarity } from "../autocapture.js";
import { captureFrame, captureResultsScreen } from "../capture.js";
import { t } from "../i18n/i18n.js";
import { Config } from "../util.js";
import { info } from "./toast.js";

const configKey = 'autoCapture';

/** Rows of "+N" labels needed to count as the results screen; 10-player races are still valid */
const MIN_ROWS = 10;
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
		let cooldown = false;
		return () => {
			if( mogi.ended ) return;
			if( cooldown ) return;
			if( checkOverlay(video) ) hits += 1;
			if( hits > 2 ) {
				captureResultsScreen(video, mogi);
				hits = 0;
				cooldown = true;
				setTimeout(() => cooldown = false, 5000);
			}
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

		/** @param {boolean} quiet */
		async function capture(quiet) {
			const result = await captureResultsScreen(video, mogi, { quiet });
			if( result === 'ok' ) lastCapturedAt = performance.now();
			// the manual resolve dialog may have been open for a while
			lastSeenAt = performance.now();
			return result;
		}

		async function poll() {
			const now = performance.now();
			const frame = captureFrame(video, frameBuffer);

			// A Switch screenshot captures straight away, unless this race is already in
			screenshotHits = withScreenshots && checkOverlay(frame) ? screenshotHits + 1 : 0;
			if( screenshotHits === SCREENSHOT_HITS ) {
				if( now - lastCapturedAt < MIN_RACE_GAP_MS ) {
					info(t('capture.alreadyCaptured'));
					return;
				}
				const result = await capture(false);
				// don't let the results screen detection capture (or ask about) this screen again
				if( result === 'ok' || result === 'cancelled' ) armed = false;
				return;
			}

			const scan = scanPointsColumn(frame);
			if( scan.rows < MIN_ROWS ) {
				prev = null;
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

			if( await countPointsLabels(scan) < MIN_ROWS ) {
				// looked like it from a distance, but it's not the results screen
				retryAt = performance.now() + RETRY_DELAY_MS;
				return;
			}
			attempts++;
			const result = await capture(attempts < MAX_ATTEMPTS);
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

	const saved = Config.get(configKey, 'off');
	select.value = [...select.options].some(o => o.value === saved) ? saved : 'off';
	setMode(select.value);
	select.addEventListener('change', () => setMode(select.value));
}
