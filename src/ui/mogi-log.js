/** @typedef {import("../mogi.js").Mogi} Mogi */
/** @typedef {import("../mogi.js").LogEntry} LogEntry */

import { fmt, t } from "../i18n/i18n.js";

const ICONS = { info: '•', success: '✓', warning: '⚠', error: '✖' };

/**
 * @param {Omit<LogEntry, 'time'>} entry
 * @returns {string} e.g. "Race 3: Saved (results screen detected)"
 */
export function formatLogEntry(entry) {
	const message = t(`log.${entry.key}`, entry.vars ?? {});
	return entry.race ? `${t('log.race', { number: entry.race })}: ${message}` : message;
}

/**
 * Show the mogi's log, newest first.
 * @param {HTMLElement} title
 * @param {HTMLOListElement} list
 * @param {Mogi} mogi
 */
export function connectLog(title, list, mogi) {
	function render() {
		const log = mogi.log;
		const problems = log.filter(e => e.level === 'warning' || e.level === 'error').length;
		title.textContent = problems ? t('log.titleWithProblems', { count: problems }) : t('log.title');
		if (!log.length) {
			const empty = document.createElement('li');
			empty.className = 'muted';
			empty.textContent = t('log.empty');
			list.replaceChildren(empty);
			return;
		}
		list.replaceChildren(...log.toReversed().map(entry => {
			const li = document.createElement('li');
			li.className = `log--${entry.level}`;
			const time = document.createElement('span');
			time.className = 'muted mono';
			time.textContent = fmt.time(new Date(entry.time));
			const text = document.createElement('span');
			text.textContent = `${ICONS[entry.level]} ${formatLogEntry(entry)}`;
			li.append(time, text);
			return li;
		}));
	}
	mogi.addEventListener('log', render);
	mogi.addEventListener('update', render); // also fires when the language changes
}
