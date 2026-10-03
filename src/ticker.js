/**
 * Call `fn` every `ms` milliseconds. Browsers slow down a page's timers while it's in the background
 * (eventually to once a minute); a worker's timers keep going, so one keeps the time.
 * @param {number} ms
 * @param {() => void} fn
 * @returns {() => void} stops it
 */
export function every(ms, fn) {
	let url = '';
	try {
		url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${Number(ms)});`], { type: 'text/javascript' }));
		const worker = new Worker(url);
		worker.onmessage = () => fn();
		return () => {
			worker.terminate();
			URL.revokeObjectURL(url);
		};
	}
	catch (err) {
		console.warn('Falling back to a page timer', err);
		if (url) URL.revokeObjectURL(url);
		const id = setInterval(fn, ms);
		return () => clearInterval(id);
	}
}
