/**
 * Sounds, so problems get noticed even when nobody is looking at the screen (e.g. while playing
 * on another display), and a way to raise a problem: log it, show it, and play the alert.
 */

/** @typedef {import("../mogi.js").Mogi} Mogi */
/** @typedef {import("../mogi.js").LogEntry} LogEntry */

import { Config } from "../util.js";
import { formatLogEntry } from "./mogi-log.js";
import { error, warning } from "./toast.js";

const configKey = 'sounds'; // 'off' | 'alerts' | 'all' (alerts and saved races)

/** @typedef {[frequency:number, seconds:number][]} Tune */
/** @type {Tune} */ const ALERT = [[880, .16], [660, .16], [880, .16], [660, .32]];
/** @type {Tune} */ const SAVED = [[784, .09], [1175, .18]];
/** @type {Tune} */ const COMPLETE = [[523, .12], [659, .12], [784, .12], [1047, .36]];

/** @type {AudioContext|null} */
let audio = null;
// Browsers only let a page make sound once it has been interacted with
function unlock() {
	audio ??= new AudioContext();
	if (audio.state === 'suspended') audio.resume();
}
window.addEventListener('pointerdown', unlock, true);
window.addEventListener('keydown', unlock, true);

/**
 * @param {Tune} tune
 * @param {number} volume
 */
function play(tune, volume) {
	if (!audio) return;
	if (audio.state === 'suspended') audio.resume();
	let at = audio.currentTime + 0.02;
	for (const [frequency, seconds] of tune) {
		const osc = audio.createOscillator();
		const gain = audio.createGain();
		osc.type = 'triangle';
		osc.frequency.value = frequency;
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(volume, at + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
		osc.connect(gain).connect(audio.destination);
		osc.start(at);
		osc.stop(at + seconds + 0.02);
		at += seconds;
	}
}

const soundsSetting = () => Config.get(configKey, 'alerts');

/** Sounds are on, but the browser won't play any until the page is clicked (e.g. after it reloaded by itself) */
export function soundsNeedClick() {
	return soundsSetting() !== 'off' && audio?.state !== 'running';
}
export function playAlert() { if (soundsSetting() !== 'off') play(ALERT, 0.35); }
export function playSaved() { if (soundsSetting() === 'all') play(SAVED, 0.2); }
export function playComplete() { if (soundsSetting() !== 'off') play(COMPLETE, 0.3); }

/**
 * Something needs looking at: log it, show it for a while, and play the alert.
 * @param {Mogi} mogi
 * @param {Omit<LogEntry, 'time'>} entry
 */
export function attention(mogi, entry) {
	mogi.addLog(entry);
	(entry.level === 'error' ? error : warning)(formatLogEntry(entry), { timeout: 10000 });
	playAlert();
}

/** @param {HTMLSelectElement} select */
export function setupSounds(select) {
	select.value = soundsSetting();
	select.addEventListener('change', () => {
		Config.set(configKey, select.value);
		// let them hear what they picked
		if (select.value === 'all') playSaved();
		else playAlert();
	});
}
