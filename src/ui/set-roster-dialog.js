import { t } from "../i18n/i18n.js";
import { Roster, ROSTER_SIZE } from "../roster.js";
import { error, success, warning } from "./toast.js";

function makeDialog() {
	const dialog = document.createElement('dialog');
	dialog.innerHTML = `
		<form method="dialog" class="modal">
			<h3>${t('rosterSetup.title')}</h3>
			<p class="muted">${t('rosterSetup.instructions', { count: ROSTER_SIZE })}</p>
			<textarea rows="${ROSTER_SIZE}" placeholder="Room 1 MMR: 9999 - Tier A&#xA;1. Player1, Player2 (9999 MMR)&#xA;...&#xA;&#xA;-- or for a war --&#xA;&#xA;WAR - Tag1 vs Tag2&#xA;1. P1, P2, P3, P4, P5, P6&#xA;2. P7, P8, P9, P10, P11, P12"></textarea>
			<label class="row">
				<span>${t('rosterSetup.tierLabel')}</span>
				<input name="tier" size="6" maxlength="8" autocomplete="off" placeholder="A" />
				<span class="muted">${t('rosterSetup.tierHint')}</span>
			</label>
			<footer>
				<button type="button" class="btn--primary">${t('confirm')}</button>
			</footer>
		</form>
	`;
	const input = /** @type {HTMLTextAreaElement} */(dialog.querySelector('textarea'));
	const tierInput = /** @type {HTMLInputElement} */(dialog.querySelector('input[name=tier]'));
	const confirm = /** @type {HTMLButtonElement} */(dialog.querySelector('footer button'));
	document.body.append(dialog);
	dialog.addEventListener('close', () => dialog.remove());
	return { dialog, input, tierInput, confirm };
}

/**
 * @param {HTMLButtonElement} btn
 * @returns {Promise<Roster>}
 */
export function requestRoster(btn) {
	return new Promise(resolve => {
		btn.addEventListener('click', () => {
			const { dialog, input, tierInput, confirm } = makeDialog();
			dialog.showModal();
			input.focus();
			// take the tier from the pasted "... - Tier X" line, when there is one
			input.addEventListener('input', () => {
				const header = input.value.trim().split(/\r?\n/)[0]?.match(/Tier (\w+)$/);
				if( header ) tierInput.value = header[1];
			});
			// Enter would submit the form, which closes the dialog without loading the roster
			tierInput.addEventListener('keydown', e => {
				if( e.key !== 'Enter' ) return;
				e.preventDefault();
				confirm.click();
			});
			confirm.addEventListener('click', () => {
				try {
					const roster = Roster.parse(input.value);
					if( !roster.full ) throw new Error(t('rosterSetup.wrongLength', { count: ROSTER_SIZE, actual: roster.size }));
					if( !roster.isWar ) roster.tier = tierInput.value.trim() || roster.tier;
					dialog.close();
					success(t('rosterSetup.rosterLoaded'));
					if( !roster.isWar && !roster.tier ) warning(t('rosterSetup.noTier'), { timeout: 10000 });
					resolve(roster);
				} catch(err) {
					error(/** @type {any} */(err).message || err);
				}
			});
		});
	});
}
