/** @typedef {import("../mogi.js").Mogi} Mogi */

import { t } from "../i18n/i18n.js";
import { ctx2d } from "../util.js";
import { attention } from "./alerts.js";
import { success } from "./toast.js";

/** How often the feed is looked at */
const CHECK_EVERY_MS = 2000;
/** A picture that doesn't change at all for this long has frozen (in the game, something is always moving) */
const FROZEN_AFTER_MS = 30000;
/** A picture that stays black for this long has been lost (e.g. OBS's virtual camera stopped) */
const BLACK_AFTER_MS = 20000;

/**
 * Raise the alarm when the camera feed is lost during a mogi (capture card unplugged, OBS closed,
 * picture frozen or black): otherwise auto-capture would miss every race without a sound.
 * @param {HTMLVideoElement} video
 * @param {HTMLSelectElement} cameraSelect
 * @param {Mogi} mogi
 */
export function watchFeed(video, cameraSelect, mogi) {
	const thumb = document.createElement('canvas');
	thumb.width = 32;
	thumb.height = 18;
	const ctx = ctx2d(thumb, { willReadFrequently: true });
	/** @type {Uint8ClampedArray|null} */
	let previous = null;
	let changedAt = 0, litAt = 0;
	/** only once the picture has shown up, so a camera that's still starting isn't taken for a lost one */
	let hadPicture = false;
	/** @type {string|null} */
	let problem = null;

	function restart() {
		previous = null;
		changedAt = litAt = performance.now();
	}
	cameraSelect.addEventListener('change', () => {
		restart();
		hadPicture = false;
	});
	// nothing is looked at while in the background, so don't count that time
	document.addEventListener('visibilitychange', restart);
	restart();

	/** @returns {string|null} what's wrong with the feed, as a log key */
	function currentProblem() {
		const track = /** @type {MediaStream|null} */(video.srcObject)?.getVideoTracks()[0];
		if (!track || track.readyState === 'ended' || !video.videoWidth) return hadPicture ? 'feedLost' : null;
		hadPicture = true;

		const now = performance.now();
		ctx.drawImage(video, 0, 0, thumb.width, thumb.height);
		const pixels = ctx.getImageData(0, 0, thumb.width, thumb.height).data;
		let changed = !previous, lit = false;
		for (let i = 0; i < pixels.length; i += 4) {
			const r = pixels[i] ?? 0, g = pixels[i + 1] ?? 0, b = pixels[i + 2] ?? 0;
			if (previous && Math.abs(r - (previous[i] ?? 0)) + Math.abs(g - (previous[i + 1] ?? 0)) + Math.abs(b - (previous[i + 2] ?? 0)) > 6) changed = true;
			if (r + g + b > 60) lit = true;
		}
		previous = pixels;
		if (changed) changedAt = now;
		if (lit) litAt = now;
		if (now - litAt > BLACK_AFTER_MS) return 'feedBlack';
		if (now - changedAt > FROZEN_AFTER_MS) return 'feedFrozen';
		return null;
	}

	setInterval(() => {
		// only while there's a mogi to capture and a camera picked
		if (mogi.ended || !cameraSelect.value || document.hidden) return;
		const found = currentProblem();
		if (found === problem) return;
		if (found) attention(mogi, { level: 'error', race: null, key: found });
		else if (problem) {
			mogi.addLog({ level: 'success', race: null, key: 'feedBack' });
			success(t('log.feedBack'));
		}
		problem = found;
	}, CHECK_EVERY_MS);
}
