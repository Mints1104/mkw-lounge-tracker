import { initI18n, t } from "./src/i18n/i18n.js";
import { RACE_COUNT } from "./src/mogi.js";
import { resumeMogi, startMogi } from "./src/saved-mogis.js";
import { setupSounds, soundsNeedClick } from "./src/ui/alerts.js";
import { setupAutoCapture } from "./src/ui/autocapture-toggle.js";
import { setupCameraList, setupCaptureButton } from "./src/ui/capture-button.js";
import { connectExportButton } from "./src/ui/export-results-dialog.js";
import { connectGallery } from "./src/ui/gallery.js";
import { setupLocaleSwitcher } from "./src/ui/locale-switcher.js";
import { connectLog } from "./src/ui/mogi-log.js";
import { setupDebugOcrButton } from "./src/ui/ocr-debug-dialog.js";
import { setupOverlay } from "./src/ui/overlay-toggle.js";
import { requestSavedMogi } from "./src/ui/saved-mogis-list.js";
import { connectScoreboard, connectScoreboardScreenshotter } from "./src/ui/scoreboard.js";
import { requestRoster } from "./src/ui/set-roster-dialog.js";
import { info, warning } from "./src/ui/toast.js";
import { isDebugMode } from "./src/util.js";

async function main() {
	const step1 = /** @type {HTMLDivElement} */(document.getElementById('step1'));
	const step2 = /** @type {HTMLDivElement} */(document.getElementById('step2'));

	const localeSelect = /** @type {HTMLSelectElement} */(document.getElementById('locale'));

	setupLocaleSwitcher(localeSelect);
	initI18n();

	const startButton = /** @type {HTMLButtonElement} */(document.getElementById('start'));
	const resumeLastButton = /** @type {HTMLButtonElement} */(document.getElementById('resumeLast'));
	const savedMogisPanel = /** @type {HTMLElement} */(document.getElementById('savedMogisPanel'));
	const savedMogisAbout = /** @type {HTMLElement} */(document.getElementById('savedMogisAbout'));
	const savedMogisList = /** @type {HTMLUListElement} */(document.getElementById('savedMogis'));

	const video = /** @type {HTMLVideoElement} */(document.getElementById('preview'));
	const cameraSelect = /** @type {HTMLSelectElement} */(document.getElementById('camera'));
	const captureBtn = /** @type {HTMLButtonElement} */(document.getElementById('capture'));
	const autoCaptureSelect = /** @type {HTMLSelectElement} */(document.getElementById('autoCapture'));
	const useOverlayToggle = /** @type {HTMLInputElement} */(document.getElementById('useOverlay'));
	const outputOl = /** @type {HTMLOListElement} */(document.getElementById('output'));
	const scoreTable = /** @type {HTMLTableElement} */(document.getElementById('scoreTable'));
	const raceGallery = /** @type {HTMLDivElement} */(document.getElementById('raceGallery'));
	const soundsSelect = /** @type {HTMLSelectElement} */(document.getElementById('sounds'));
	const logTitle = /** @type {HTMLElement} */(document.getElementById('mogiLogTitle'));
	const logList = /** @type {HTMLOListElement} */(document.getElementById('mogiLog'));
	const snapshotButton = /** @type {HTMLButtonElement} */(document.getElementById('snapshotScores'));
	const exportBtn = /** @type {HTMLButtonElement} */(document.getElementById('exportScores'));
	const downloadBtn = /** @type {HTMLButtonElement} */(document.getElementById('downloadMogi'));

	// Reloading the page (or coming back to it) picks up the mogi that was open; otherwise start a new one or pick a saved one
	const openId = new URLSearchParams(location.hash.slice(1)).get('mogi');
	const reopened = openId ? await resumeMogi(openId).catch(() => null) : null;
	const { id, mogi } = reopened ?? await Promise.race([
		requestRoster(startButton).then(startMogi),
		requestSavedMogi(savedMogisPanel, savedMogisAbout, savedMogisList, resumeLastButton)
	]);
	history.replaceState(null, '', `#mogi=${id}`);

	step1.style.display = 'none';
	step2.style.display = 'block';

	setupCameraList(cameraSelect, video);
	setupCaptureButton(captureBtn, video, outputOl, mogi);
	setupAutoCapture(autoCaptureSelect, captureBtn, video, mogi);
	setupOverlay(useOverlayToggle, mogi);
	connectScoreboard(scoreTable, video, mogi);
	connectScoreboardScreenshotter(snapshotButton, scoreTable);
	connectExportButton(exportBtn, downloadBtn, mogi);
	connectGallery(raceGallery, mogi);
	connectLog(logTitle, logList, mogi);
	setupSounds(soundsSelect);

	if( isDebugMode() ) setupDebugOcrButton();

	mogi.triggerUpdate(); // render everything (and save) now that it's all connected
	if( mogi.size > 0 && !mogi.ended ) info(t('savedMogis.resumed', { count: mogi.size, total: RACE_COUNT }));
	if( !mogi.ended && soundsNeedClick() ) warning(t('capture.soundsNeedClick'), { timeout: 20000 });
}

main();
