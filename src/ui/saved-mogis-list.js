/** @typedef {import("../saved-mogis.js").SavedMogi} SavedMogi */
/** @typedef {import("../saved-mogis.js").Session} Session */

import { onLocaleChange, t } from "../i18n/i18n.js";
import { RACE_COUNT } from "../mogi.js";
import { downloadZip } from "../export-zip.js";
import { createBackup, deleteSavedMogi, listSavedMogis, MAX_SAVED, restoreBackup, resumeMogi } from "../saved-mogis.js";
import { error, info, success } from "./toast.js";

/** @param {SavedMogi} m */
function formatLabel(m) {
	const n = m.summary.playersPerTeam;
	const parts = [m.isWar ? t('savedMogis.war') : n > 1 ? `${n}v${n}` : t('savedMogis.ffa')];
	if (m.tier && !m.isWar) parts.push(t('savedMogis.tier', { tier: m.tier }));
	return parts.join(' · ');
}

/**
 * @param {string} text
 * @param {string} className
 * @param {string} action
 * @param {string} id
 */
function makeButton(text, className, action, id) {
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = text;
	if (className) button.className = className;
	button.dataset.action = action;
	button.dataset.id = id;
	return button;
}

/** @param {SavedMogi} m */
function renderItem(m) {
	const { ended, raceCount, standings } = m.summary;
	const li = document.createElement('li');

	const details = document.createElement('div');
	details.className = 'saved-mogi__info';
	const title = document.createElement('div');
	const status = document.createElement('span');
	status.className = `badge ${ended ? 'badge--done' : 'badge--live'}`;
	status.textContent = ended ? t('savedMogis.finished') : t('savedMogis.inProgress');
	const label = document.createElement('strong');
	label.textContent = formatLabel(m);
	const when = document.createElement('span');
	when.className = 'muted';
	when.textContent = new Date(m.startTime).toLocaleString(document.documentElement.lang || undefined, { dateStyle: 'medium', timeStyle: 'short' });
	title.append(status, ' ', label, ' ', when);

	const summary = document.createElement('div');
	summary.className = 'muted';
	const top = standings.slice(0, 3).map((s, i) => `${i + 1}. ${s.name} (${s.score})`).join(' · ');
	summary.textContent = t('savedMogis.races', { count: raceCount, total: RACE_COUNT }) + (raceCount > 0 ? ` — ${top}` : '');
	details.append(title, summary);

	const open = makeButton(ended ? t('savedMogis.open') : t('savedMogis.resume'), ended ? '' : 'btn--primary', 'open', m.id);
	const remove = makeButton('🗑', 'btn--danger', 'delete', m.id);
	remove.title = remove.ariaLabel = t('savedMogis.delete');
	li.append(details, open, remove);
	return li;
}

/**
 * @typedef {Object} SavedMogisElements
 * @prop {HTMLElement} panel
 * @prop {HTMLElement} about
 * @prop {HTMLUListElement} list
 * @prop {HTMLButtonElement} resumeLastButton shortcut to the latest mogi, if it isn't finished
 * @prop {HTMLButtonElement} backupButton
 * @prop {HTMLButtonElement} restoreButton
 * @prop {HTMLInputElement} restoreFile
 */

/**
 * List the saved mogis on the landing page, and resolve with the one the user opens.
 * @param {SavedMogisElements} elements
 * @returns {Promise<Session>}
 */
export function requestSavedMogi({ panel, about, list, resumeLastButton, backupButton, restoreButton, restoreFile }) {
	return new Promise(resolve => {
		/** @type {SavedMogi[]} */
		let saved = [];
		let busy = false;

		function render() {
			panel.style.display = '';
			about.textContent = t('savedMogis.about', { count: MAX_SAVED });
			if (saved.length) list.replaceChildren(...saved.map(renderItem));
			else {
				const empty = document.createElement('li');
				empty.className = 'muted';
				empty.textContent = t('savedMogis.empty');
				list.replaceChildren(empty);
			}
			backupButton.disabled = !saved.length;
			const latest = saved[0];
			resumeLastButton.hidden = !latest || latest.summary.ended;
			if (latest && !latest.summary.ended) {
				resumeLastButton.dataset.id = latest.id;
				resumeLastButton.textContent = t('savedMogis.resumeLast', { count: latest.summary.raceCount, total: RACE_COUNT });
			}
		}

		async function refresh() {
			try {
				saved = await listSavedMogis();
			}
			catch (err) {
				console.error('Could not list saved mogis', err);
				saved = [];
			}
			render();
		}

		/** @param {string} id */
		async function open(id) {
			const session = await resumeMogi(id);
			if (session) resolve(session);
			else {
				error(t('savedMogis.notFound'));
				await refresh();
			}
		}

		/** @param {string} id */
		async function remove(id) {
			if (!confirm(t('savedMogis.confirmDelete'))) return;
			await deleteSavedMogi(id);
			info(t('savedMogis.deleted'));
			await refresh();
		}

		async function backup() {
			const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
			downloadZip(await createBackup(), `mogi-backup-${date}`);
			success(t('savedMogis.backupDone'));
		}

		/** @param {File} file */
		async function restore(file) {
			const count = await restoreBackup(file).catch(err => {
				console.error(err);
				error(t('savedMogis.restoreFailed'));
				return null;
			});
			if (count === null) return;
			if (count) success(t(count === 1 ? 'savedMogis.restoredOne' : 'savedMogis.restored', { count }));
			else info(t('savedMogis.nothingToRestore'));
			await refresh();
		}

		/**
		 * @template T
		 * @param {(arg:T) => Promise<void>} action
		 * @param {string} failure translation key of the message when it fails
		 */
		const run = (action, failure) => async (/** @type {T|undefined} */ arg) => {
			if (busy || arg === undefined) return;
			busy = true;
			try {
				await action(arg);
			}
			catch (err) {
				console.error(err);
				error(t(failure));
			}
			finally {
				busy = false;
			}
		};
		const runOpen = run(open, 'savedMogis.notFound'), runRemove = run(remove, 'savedMogis.notFound');
		const runBackup = run(backup, 'savedMogis.backupFailed'), runRestore = run(restore, 'savedMogis.restoreFailed');

		list.addEventListener('click', e => {
			const button = /** @type {HTMLElement} */(e.target).closest('button');
			if (button?.dataset.action === 'open') runOpen(button.dataset.id);
			if (button?.dataset.action === 'delete') runRemove(button.dataset.id);
		});
		resumeLastButton.addEventListener('click', () => runOpen(resumeLastButton.dataset.id));
		backupButton.addEventListener('click', () => runBackup(null));
		restoreButton.addEventListener('click', () => restoreFile.click());
		restoreFile.addEventListener('change', () => {
			const file = restoreFile.files?.[0];
			restoreFile.value = '';
			if (file) runRestore(file);
		});
		onLocaleChange(render);
		refresh();
	});
}
