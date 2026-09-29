/** @typedef {import("../saved-mogis.js").SavedMogi} SavedMogi */
/** @typedef {import("../saved-mogis.js").Session} Session */

import { onLocaleChange, t } from "../i18n/i18n.js";
import { RACE_COUNT } from "../mogi.js";
import { deleteSavedMogi, listSavedMogis, MAX_SAVED, resumeMogi } from "../saved-mogis.js";
import { error, info } from "./toast.js";

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
 * List the saved mogis on the landing page, and resolve with the one the user opens.
 * @param {HTMLElement} panel
 * @param {HTMLElement} about
 * @param {HTMLUListElement} list
 * @param {HTMLButtonElement} resumeLastButton shortcut to the latest mogi, if it isn't finished
 * @returns {Promise<Session>}
 */
export function requestSavedMogi(panel, about, list, resumeLastButton) {
	return new Promise(resolve => {
		/** @type {SavedMogi[]} */
		let saved = [];
		let busy = false;

		function render() {
			panel.style.display = saved.length ? '' : 'none';
			about.textContent = t('savedMogis.about', { count: MAX_SAVED });
			list.replaceChildren(...saved.map(renderItem));
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

		/** @param {(id:string) => Promise<void>} action */
		const run = action => async (/** @type {string|undefined} */ id) => {
			if (busy || !id) return;
			busy = true;
			try {
				await action(id);
			}
			catch (err) {
				console.error(err);
				error(t('savedMogis.notFound'));
			}
			finally {
				busy = false;
			}
		};
		const runOpen = run(open), runRemove = run(remove);

		list.addEventListener('click', e => {
			const button = /** @type {HTMLElement} */(e.target).closest('button');
			if (button?.dataset.action === 'open') runOpen(button.dataset.id);
			if (button?.dataset.action === 'delete') runRemove(button.dataset.id);
		});
		resumeLastButton.addEventListener('click', () => runOpen(resumeLastButton.dataset.id));
		onLocaleChange(render);
		refresh();
	});
}
