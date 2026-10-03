import Tesseract from 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';
import { captureFrame, preprocessCrop } from "./capture.js";
import { OCR_GRID, preloadOcr } from "./ocr.js";
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
/** @param {HTMLVideoElement|HTMLCanvasElement} source video, or a frame already captured from it */
export function checkOverlay(source) {
	const frame = source instanceof HTMLCanvasElement ? source : captureFrame(source, frameBuffer);
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
const pointsRects = () => columnRects(1650, 90);
/** Rows of "+N" labels needed to count as the results screen; 10-player races are still valid */
export const MIN_POINTS_ROWS = 10;
/** A results screen with fewer players than MIN_POINTS_ROWS (but at least this many) is a race that gets redone */
export const MIN_REDO_ROWS = 5;
/** Each player's total before this race, right of the "+N" column */
const totalRects = () => columnRects(1735, 95);

/** @type {Map<number, {x:number, y:number, w:number, h:number}[]>} */
const columnRectsCache = new Map();
/**
 * One rect per row of the results screen, built on first use: ocr.js and capture.js import each
 * other, so OCR_GRID may not exist yet while this module loads.
 * @param {number} x
 * @param {number} w
 */
function columnRects(x, w) {
	let rects = columnRectsCache.get(x);
	if (!rects) columnRectsCache.set(x, rects = OCR_GRID.nameRects.map(r => ({ x, y: r.y, w, h: r.h })));
	return rects;
}

/**
 * @typedef {Object} PointsColumnScan
 * @prop {number} rows Number of rows that look like they contain text
 * @prop {Uint8Array} bits Binarized column (1 = text), for comparing consecutive frames
 *
 * @typedef {import("./race.js").GameScore} GameScore
 */

/**
 * Binarize one label: the pills behind the labels are translucent, so the track shows through;
 * rather than splitting background from foreground, keep only the pixels close to the brightest
 * ones, which works for yellow-on-dark rows as well as the white-on-yellow highlighted row.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number, y:number, w:number, h:number}} r
 * @returns {{bits:Uint8Array, hasText:boolean}}
 */
function binarize(ctx, r) {
	const size = r.w * r.h;
	const { data } = ctx.getImageData(r.x, r.y, r.w, r.h);
	const lum = new Uint8Array(size);
	const hist = new Uint32Array(256);
	for (let i = 0; i < size; i++) {
		const y = (data[i*4] * 299 + data[i*4+1] * 587 + data[i*4+2] * 114) / 1000 | 0;
		lum[i] = y;
		hist[y]++;
	}
	const threshold = percentile(hist, size, 0.97) - 30;
	const bits = new Uint8Array(size);
	let fg = 0, fgSum = 0, bgSum = 0;
	for (let i = 0; i < size; i++) {
		if (lum[i] > threshold) { bits[i] = 1; fg++; fgSum += lum[i]; }
		else bgSum += lum[i];
	}
	const bg = size - fg;
	const contrast = fg && bg ? fgSum / fg - bgSum / bg : 0;
	const fgRatio = fg / size;
	// digits are thin strokes on a darker pill: clear contrast, small foreground
	return { bits, hasText: contrast >= 45 && fgRatio >= 0.03 && fgRatio <= 0.3 };
}

/**
 * Cheap check, run on every poll: count the rows of the points column that look like they
 * hold a short, bright label.
 * @param {HTMLCanvasElement} frame
 * @returns {PointsColumnScan}
 */
export function scanPointsColumn(frame) {
	return scanColumn(frame, pointsRects());
}

/**
 * Cheap check for the standings that follow the results: count the rows of the totals column that hold a number.
 * @param {HTMLCanvasElement} frame
 * @returns {PointsColumnScan}
 */
export function scanTotalsColumn(frame) {
	return scanColumn(frame, totalRects());
}

/**
 * @param {HTMLCanvasElement} frame
 * @param {{x:number, y:number, w:number, h:number}[]} rects
 * @returns {PointsColumnScan}
 */
function scanColumn(frame, rects) {
	const ctx = ctx2d(frame, { willReadFrequently: true });
	const size = rects[0].w * rects[0].h;
	const bits = new Uint8Array(size * rects.length);
	let rows = 0;
	rects.forEach((r, idx) => {
		const row = binarize(ctx, r);
		bits.set(row.bits, idx * size);
		if (row.hasText) rows++;
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

/** @type {Promise<any>|null} */
let _pointsWorker = null;
function getPointsWorker() {
	return _pointsWorker ??= (async () => {
		// separate worker, so its settings never clash with the name OCR running at the same time
		const worker = await Tesseract.createWorker('eng', 1, { logger: () => { } }, { load_system_dawg: 'F', load_freq_dawg: 'F' });
		await worker.setParameters({
			tessedit_char_whitelist: '+0123456789',
			tessedit_pageseg_mode: '6' // SINGLE_BLOCK
		});
		return worker;
	})();
}

/** Load both OCR engines ahead of time, so the first results screen isn't missed while they load */
export function preloadResultsDetection() {
	return Promise.all([getPointsWorker(), preloadOcr()]);
}

const OCR_PAD = 12;
/**
 * Draw binarized labels as dark text on a light background, one under the other, for OCR.
 * @param {Uint8Array[]} rows
 * @param {number} w
 * @param {number} h
 * @param {HTMLCanvasElement} canvas
 */
function renderForOcr(rows, w, h, canvas) {
	const pad = OCR_PAD;
	canvas.width = w + pad * 2;
	canvas.height = rows.length * (h + pad) + pad;
	const ctx = ctx2d(canvas, { willReadFrequently: true });
	const img = ctx.createImageData(canvas.width, canvas.height);
	img.data.fill(255);
	rows.forEach((bits, row) => {
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				if (!bits[y*w + x]) continue;
				const o = ((pad + row * (h + pad) + y) * canvas.width + pad + x) * 4;
				img.data[o] = img.data[o+1] = img.data[o+2] = 0;
			}
		}
	});
	ctx.putImageData(img, 0, 0);
	return canvas;
}

const ocrCanvas = document.createElement('canvas');
/**
 * Expensive check, only run once the cheap scan looks promising: OCR the points column and
 * count the rows that read as "+N".
 * @param {PointsColumnScan} scan
 * @returns {Promise<number>}
 */
export async function countPointsLabels(scan) {
	const rects = pointsRects();
	const { w, h } = rects[0];
	const rows = rects.map((_, i) => scan.bits.subarray(i * w * h, (i + 1) * w * h));
	const worker = await getPointsWorker();
	const { data } = await worker.recognize(renderForOcr(rows, w, h, ocrCanvas));
	return String(data?.text ?? '').split('\n').filter(line => /^\+\d{1,2}$/.test(line.replace(/\s+/g, ''))).length;
}

/**
 * Read the points each row got this race ("+N") and its total before this race, as the game shows them.
 * @param {HTMLCanvasElement} frame a results screen
 * @returns {Promise<GameScore[]>} one per row, top to bottom; null where nothing could be read
 */
export async function readGameScores(frame) {
	const points = await readColumn(frame, pointsRects(), /^\+(\d{1,2})$/);
	const totals = await readTotals(frame);
	return points.map((p, i) => ({ points: p, total: totals[i] ?? null }));
}

/**
 * Read the totals column, as on the results screen and the standings after it.
 * @param {HTMLCanvasElement} frame
 * @returns {Promise<(number|null)[]>} one per row, top to bottom
 */
export function readTotals(frame) {
	return readColumn(frame, totalRects(), /^(\d{1,3})$/);
}

/**
 * OCR a whole column at once, then match each line of text back to its row by position.
 * @param {HTMLCanvasElement} frame
 * @param {{x:number, y:number, w:number, h:number}[]} rects
 * @param {RegExp} pattern
 * @returns {Promise<(number|null)[]>}
 */
async function readColumn(frame, rects, pattern) {
	const ctx = ctx2d(frame, { willReadFrequently: true });
	const worker = await getPointsWorker();
	const { w, h } = rects[0];
	const rows = rects.map(r => binarize(ctx, r)).map(r => r.hasText ? r.bits : new Uint8Array(w * h));
	const { data } = await worker.recognize(renderForOcr(rows, w, h, ocrCanvas));
	/** @type {(number|null)[]} */
	const values = rects.map(() => null);
	for (const line of data?.lines ?? []) {
		const row = Math.floor(((line.bbox.y0 + line.bbox.y1) / 2 - OCR_PAD) / (h + OCR_PAD));
		const match = pattern.exec(String(line.text).replace(/\s+/g, ''));
		if (match && row >= 0 && row < values.length) values[row] = Number(match[1]);
	}
	return values;
}

/**
 * Is this the results screen of a race with too few players to count (so it gets redone)?
 * @param {HTMLCanvasElement} frame
 * @param {PointsColumnScan} [scan]
 * @returns {Promise<number>} how many players were on it, or 0 if it isn't one
 */
export async function countRedoPlayers(frame, scan = scanPointsColumn(frame)) {
	if (scan.rows < MIN_REDO_ROWS || scan.rows >= MIN_POINTS_ROWS) return 0;
	const count = await countPointsLabels(scan);
	return count >= MIN_REDO_ROWS && count < MIN_POINTS_ROWS ? count : 0;
}
