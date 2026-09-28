import Tesseract from 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';
import { captureFrame, preprocessCrop } from "./capture.js";
import { OCR_GRID } from "./ocr.js";
import { ctx2d, popcount } from "./util.js";

const HOME_ROI = { x: 506, y: 45, w: 40, h:40 };

/**
 * See: ../img/home-icon-reference.png
 */
const HOME_BITMASK = new Uint8Array([
	0x00, 0x01, 0xFF, 0x80, 0x00, // ........ .......# ######## #....... ........
	0x00, 0x0F, 0xFF, 0xF0, 0x00, // ........ ....#### ######## ####.... ........
	0x00, 0x3F, 0xFF, 0xFC, 0x00, // ........ ..###### ######## ######.. ........
	0x00, 0xFF, 0xFF, 0xFF, 0x00, // ........ ######## ######## ######## ........
	0x01, 0xFF, 0xFF, 0xFF, 0x80, // .......# ######## ######## ######## #.......
	0x03, 0xFF, 0xE7, 0xFF, 0xC0, // ......## ######## ###..### ######## ##......
	0x07, 0xFF, 0xC3, 0xFF, 0xE0, // .....### ######## ##....## ######## ###.....
	0x0F, 0xFF, 0x81, 0xFF, 0xF0, // ....#### ######## #......# ######## ####....
	0x1F, 0xFF, 0x00, 0xFF, 0xF8, // ...##### ######## ........ ######## #####...
	0x1F, 0xFE, 0x00, 0x7F, 0xF8, // ...##### #######. ........ .####### #####...
	0x3F, 0xF8, 0x00, 0x1F, 0xFC, // ..###### #####... ........ ...##### ######..
	0x3F, 0xF0, 0x00, 0x0F, 0xFC, // ..###### ####.... ........ ....#### ######..
	0x7F, 0xE0, 0x00, 0x07, 0xFE, // .####### ###..... ........ .....### #######.
	0x7F, 0xC0, 0x00, 0x03, 0xFE, // .####### ##...... ........ ......## #######.
	0x7F, 0x80, 0x00, 0x01, 0xFE, // .####### #....... ........ .......# #######.
	0xFE, 0x00, 0x00, 0x00, 0x7F, // #######. ........ ........ ........ .#######
	0xFC, 0x00, 0x00, 0x00, 0x3F, // ######.. ........ ........ ........ ..######
	0xFC, 0x00, 0x00, 0x00, 0x3F, // ######.. ........ ........ ........ ..######
	0xFC, 0x00, 0x00, 0x00, 0x3F, // ######.. ........ ........ ........ ..######
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0xFF, 0xC0, 0x7E, 0x03, 0xFF, // ######## ##...... .######. ......## ########
	0x7F, 0xC0, 0x00, 0x03, 0xFE, // .####### ##...... ........ ......## #######.
	0x7F, 0xC0, 0x00, 0x03, 0xFE, // .####### ##...... ........ ......## #######.
	0x7F, 0xC0, 0x00, 0x03, 0xFE, // .####### ##...... ........ ......## #######.
	0x3F, 0xC0, 0x00, 0x03, 0xFC, // ..###### ##...... ........ ......## ######..
	0x3F, 0xC0, 0x00, 0x03, 0xFC, // ..###### ##...... ........ ......## ######..
	0x1F, 0xC0, 0x00, 0x03, 0xF8, // ...##### ##...... ........ ......## #####...
	0x1F, 0xFF, 0xFF, 0xFF, 0xF8, // ...##### ######## ######## ######## #####...
	0x0F, 0xFF, 0xFF, 0xFF, 0xF0, // ....#### ######## ######## ######## ####....
	0x07, 0xFF, 0xFF, 0xFF, 0xE0, // .....### ######## ######## ######## ###.....
	0x03, 0xFF, 0xFF, 0xFF, 0xC0, // ......## ######## ######## ######## ##......
	0x01, 0xFF, 0xFF, 0xFF, 0x80, // .......# ######## ######## ######## #.......
	0x00, 0xFF, 0xFF, 0xFF, 0x00, // ........ ######## ######## ######## ........
	0x00, 0x3F, 0xFF, 0xFC, 0x00, // ........ ..###### ######## ######.. ........
	0x00, 0x0F, 0xFF, 0xF0, 0x00, // ........ ....#### ######## ####.... ........
	0x00, 0x01, 0xFF, 0x80, 0x00  // ........ .......# ######## #....... ........
]);

const POP = (() => {
	const t = new Uint8Array(256);
	for( let i=0; i<256; i++ ) t[i] = popcount(i);
	return t;
})();

const frameBuffer = document.createElement('canvas');
const scratch = document.createElement('canvas');
/** @param {HTMLVideoElement} video */
export function checkOverlay(video) {
	const frame = captureFrame(video, frameBuffer);
	const { canvas, whiteRatio } = preprocessCrop(frame, HOME_ROI, 1, scratch);
	// icon is about 50:50 black/white, so if the ratio is too low or too high, it's probably not the icon we're looking for
	if( whiteRatio < 0.4 || whiteRatio > 0.6) return false;

	const pctx = ctx2d(canvas, { willReadFrequently: true });
	const img = pctx.getImageData(0, 0, canvas.width, canvas.height);
	let error = 0;
	const maxErrorTolerance = (HOME_BITMASK.length * 8) * 0.2;
	for( let i=0; i<HOME_BITMASK.length; i++ ) {
		const region =
			  (img.data[(i*8+0)*4] == 255 ? 0x80 : 0)
			| (img.data[(i*8+1)*4] == 255 ? 0x40 : 0)
			| (img.data[(i*8+2)*4] == 255 ? 0x20 : 0)
			| (img.data[(i*8+3)*4] == 255 ? 0x10 : 0)
			| (img.data[(i*8+4)*4] == 255 ? 0x08 : 0)
			| (img.data[(i*8+5)*4] == 255 ? 0x04 : 0)
			| (img.data[(i*8+6)*4] == 255 ? 0x02 : 0)
			| (img.data[(i*8+7)*4] == 255 ? 0x01 : 0);
		error += POP[region ^ HOME_BITMASK[i]];
		if( error > maxErrorTolerance ) return false;
	}
	return true;
}

/**
 * The "+15", "+12", ... column of the race results screen, just left of the running totals.
 * It disappears once the screen transitions to the overall rankings, which makes it a
 * reliable way to tell the two apart.
 */
const POINTS_RECTS = OCR_GRID.nameRects.map(r => ({ x: 1650, y: r.y, w: 90, h: r.h }));

/**
 * @typedef {Object} PointsColumnScan
 * @prop {number} rows Number of rows that look like they contain text
 * @prop {Uint8Array} bits Binarized column (1 = text), for comparing consecutive frames
 */

/**
 * Cheap check, run on every poll: binarize each row of the points column and count the rows
 * that look like they hold a short, bright label.
 * The pills behind the labels are translucent, so the track shows through; rather than
 * splitting background from foreground, keep only the pixels close to the brightest ones,
 * which works for yellow-on-dark rows as well as the white-on-yellow highlighted row.
 * @param {HTMLCanvasElement} frame
 * @returns {PointsColumnScan}
 */
export function scanPointsColumn(frame) {
	const ctx = ctx2d(frame, { willReadFrequently: true });
	const size = POINTS_RECTS[0].w * POINTS_RECTS[0].h;
	const bits = new Uint8Array(size * POINTS_RECTS.length);
	const lum = new Uint8Array(size);
	const hist = new Uint32Array(256);
	let rows = 0;
	POINTS_RECTS.forEach((r, idx) => {
		const { data } = ctx.getImageData(r.x, r.y, r.w, r.h);
		hist.fill(0);
		for (let i = 0; i < size; i++) {
			const y = (data[i*4] * 299 + data[i*4+1] * 587 + data[i*4+2] * 114) / 1000 | 0;
			lum[i] = y;
			hist[y]++;
		}
		const threshold = percentile(hist, size, 0.97) - 30;
		let fg = 0, fgSum = 0, bgSum = 0;
		for (let i = 0; i < size; i++) {
			if (lum[i] > threshold) { bits[idx*size + i] = 1; fg++; fgSum += lum[i]; }
			else bgSum += lum[i];
		}
		const bg = size - fg;
		const contrast = fg && bg ? fgSum / fg - bgSum / bg : 0;
		const fgRatio = fg / size;
		// digits are thin strokes on a darker pill: clear contrast, small foreground
		if (contrast >= 45 && fgRatio >= 0.03 && fgRatio <= 0.3) rows++;
	});
	return { rows, bits };
}

/**
 * Luminance below which the given fraction of pixels fall.
 * @param {Uint32Array} hist
 * @param {number} total
 * @param {number} fraction
 */
function percentile(hist, total, fraction) {
	let count = 0;
	for (let i = 0; i < 256; i++) {
		count += hist[i] ?? 0;
		if (count >= total * fraction) return i;
	}
	return 255;
}

/**
 * Overlap of the text pixels of two scans (intersection over union), 1 = identical.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
export function scanSimilarity(a, b) {
	let both = 0, either = 0;
	for (let i = 0; i < a.length; i++) {
		if (a[i] && b[i]) both++;
		if (a[i] || b[i]) either++;
	}
	return either ? both / either : 1;
}

let _pointsWorker = /** @type {any} */(null);
async function getPointsWorker() {
	if (_pointsWorker) return _pointsWorker;
	// separate worker, so its settings never clash with the name OCR running at the same time
	_pointsWorker = await Tesseract.createWorker('eng', 1, { logger: () => { } }, { load_system_dawg: 'F', load_freq_dawg: 'F' });
	await _pointsWorker.setParameters({
		tessedit_char_whitelist: '+0123456789',
		tessedit_pageseg_mode: '6' // SINGLE_BLOCK
	});
	return _pointsWorker;
}

const pointsCanvas = document.createElement('canvas');
/**
 * Expensive check, only run once the cheap scan looks promising: OCR the points column and
 * count the rows that read as "+N".
 * @param {PointsColumnScan} scan
 * @returns {Promise<number>}
 */
export async function countPointsLabels(scan) {
	const { w, h } = POINTS_RECTS[0];
	const pad = 12;
	pointsCanvas.width = w + pad * 2;
	pointsCanvas.height = POINTS_RECTS.length * (h + pad) + pad;
	const pctx = ctx2d(pointsCanvas, { willReadFrequently: true });
	const img = pctx.createImageData(pointsCanvas.width, pointsCanvas.height);
	img.data.fill(255);
	for (let row = 0; row < POINTS_RECTS.length; row++) {
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				if (!scan.bits[row*w*h + y*w + x]) continue;
				const o = ((pad + row * (h + pad) + y) * pointsCanvas.width + pad + x) * 4;
				img.data[o] = img.data[o+1] = img.data[o+2] = 0; // dark text on light background
			}
		}
	}
	pctx.putImageData(img, 0, 0);
	const worker = await getPointsWorker();
	const { data } = await worker.recognize(pointsCanvas);
	return String(data?.text ?? '').split('\n').filter(line => /^\+\d{1,2}$/.test(line.replace(/\s+/g, ''))).length;
}
