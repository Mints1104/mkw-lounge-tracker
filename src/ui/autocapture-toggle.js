/** @typedef {import("../mogi.js").Mogi} Mogi */
/** @typedef {import("../autocapture.js").PointsColumnScan} PointsColumnScan */

import { checkOverlay, countPointsLabels, scanPointsColumn, scanSimilarity } from "../autocapture.js";
import { captureFrame, captureResultsScreen } from "../capture.js";
import { Config } from "../util.js";

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

/**
 * Modes: 'off', 'on' (when a Switch screenshot is taken), 'results' (when the results screen appears)
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

	function pollForResultsScreen() {
		const frameBuffer = document.createElement('canvas');
		let busy = false;
		let armed = true;
		let attempts = 0;
		let lastSeenAt = 0;
		let stableSince = 0;
		let retryAt = 0;
		/** @type {PointsColumnScan|null} */
		let prev = null;
		return async () => {
			if( mogi.ended || busy ) return;
			const now = performance.now();
			const scan = scanPointsColumn(captureFrame(video, frameBuffer));
			if( scan.rows < MIN_ROWS ) {
				prev = null;
				if( !armed && now - lastSeenAt > REARM_AFTER_MS ) {
					armed = true;
					attempts = 0;
				}
				return;
			}
			lastSeenAt = now;
			if( !armed || now < retryAt ) return;

			// wait for the rows to stop animating before reading them
			const stable = prev && scanSimilarity(prev.bits, scan.bits) >= STABLE_SIMILARITY;
			if( !stable || scan.rows !== prev?.rows ) stableSince = now;
			prev = scan;
			if( !stable ) return;
			if( scan.rows < 12 && now - stableSince < WAIT_FOR_MISSING_ROWS_MS ) return;

			busy = true;
			try {
				if( await countPointsLabels(scan) < MIN_ROWS ) {
					// looked like it from a distance, but it's not the results screen
					retryAt = performance.now() + RETRY_DELAY_MS;
					return;
				}
				attempts++;
				const result = await captureResultsScreen(video, mogi, { quiet: attempts < MAX_ATTEMPTS });
				if( result === 'no_scoreboard' && attempts < MAX_ATTEMPTS ) {
					retryAt = performance.now() + RETRY_DELAY_MS;
					return;
				}
				// captured, cancelled by the user, or failed for good: leave this screen alone
				armed = false;
			}
			finally {
				busy = false;
				lastSeenAt = performance.now();
			}
		};
	}

	/** @param {string} mode */
	function setMode(mode) {
		clearInterval(interval);
		interval = 0;
		if( mode === 'on' ) interval = setInterval(pollForScreenshot(), 200);
		if( mode === 'results' ) interval = setInterval(pollForResultsScreen(), 250);
		captureButton.disabled = mode !== 'off';
		Config.set(configKey, mode);
	}

	const saved = Config.get(configKey, 'off');
	select.value = [...select.options].some(o => o.value === saved) ? saved : 'off';
	setMode(select.value);
	select.addEventListener('change', () => setMode(select.value));
}
