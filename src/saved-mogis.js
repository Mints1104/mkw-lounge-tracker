/**
 * Saves every mogi in the browser (IndexedDB) as it is played, so it can be resumed after
 * closing the tab, or reopened later to get the results.
 * IndexedDB rather than localStorage: a mogi's 12 screenshots alone are a few MB, which is
 * about all localStorage allows in total.
 */

import { t } from "./i18n/i18n.js";
import { Mogi, RACE_COUNT } from "./mogi.js";
import { Player, Substitute } from "./player.js";
import { Placement, Race } from "./race.js";
import { Roster } from "./roster.js";
import { warning } from "./ui/toast.js";

/**
 * @typedef {Object} SavedSubstitute
 * @prop {string} id
 * @prop {string} name
 * @prop {string} ign
 * @prop {number} joinedAt
 *
 * @typedef {Object} SavedPlayer
 * @prop {string} id
 * @prop {string} name
 * @prop {number} seed
 * @prop {number} mmr
 * @prop {string} ign
 * @prop {SavedSubstitute[]} substitutes
 *
 * @typedef {Object} SavedPlacement
 * @prop {number} placement
 * @prop {string|null} playerId
 * @prop {string} resolvedName
 * @prop {string} ocrText
 * @prop {number} ocrConfidence
 * @prop {boolean} dc
 *
 * @typedef {Object} SavedRace
 * @prop {number} timestamp
 * @prop {SavedPlacement[]} placements
 * @prop {import("./race.js").GameScore[]} [gameScores]
 *
 * @typedef {Object} SavedStanding
 * @prop {string} name player, or team tag/players
 * @prop {number} score
 *
 * @typedef {Object} SavedMogi
 * @prop {string} id
 * @prop {number} startTime
 * @prop {number} [updatedAt]
 * @prop {string} tier
 * @prop {boolean} isWar
 * @prop {string[]} warTags
 * @prop {SavedPlayer[]} players
 * @prop {{seed:number, index:number, tag:string}[]} teams
 * @prop {SavedRace[]} races
 * @prop {import("./mogi.js").LogEntry[]} [log]
 * @prop {{playersPerTeam:number, raceCount:number, ended:boolean, standings:SavedStanding[]}} summary for listing without rebuilding the mogi
 *
 * @typedef {Object} Session
 * @prop {string} id
 * @prop {Mogi} mogi
 */

const DB_NAME = 'mogi-history';
const MOGIS = 'mogis';
const SNAPSHOTS = 'snapshots'; // race screenshots, keyed "<mogi id>/<race timestamp>"
/** Older mogis beyond this many are deleted, so the screenshots don't pile up forever */
export const MAX_SAVED = 50;
const MISSING_SNAPSHOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==';

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;
function openDb() {
	return dbPromise ??= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(MOGIS, { keyPath: 'id' });
			req.result.createObjectStore(SNAPSHOTS);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/**
 * @template T
 * @param {IDBRequest<T>} req
 * @returns {Promise<T>}
 */
function result(req) {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** @param {IDBTransaction} tx */
function committed(tx) {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve(undefined);
		tx.onerror = tx.onabort = () => reject(tx.error);
	});
}

/**
 * @param {string} id
 * @param {number} timestamp
 */
const snapshotKey = (id, timestamp) => `${id}/${timestamp}`;

/** @param {string} id */
const allSnapshotsOf = id => IDBKeyRange.bound(`${id}/`, `${id}/￿`);

/** @param {Mogi} mogi */
function standings(mogi) {
	const scores = mogi.calculatePlayerScores();
	/** @param {import("./player.js").Player[]} players */
	const total = players => players.reduce((sum, p) => sum + (scores.get(p.id) ?? 0), 0);
	const rows = mogi.playersPerTeam > 1
		? mogi.teams.map(team => ({ name: team.tag || team.players.map(p => p.name).join(', '), score: total(team.players) }))
		: [...mogi.roster].map(p => ({ name: p.name, score: total([p]) }));
	return rows.sort((a, b) => b.score - a.score);
}

/**
 * @param {Mogi} mogi
 * @param {string} id
 * @returns {SavedMogi}
 */
function serialize(mogi, id) {
	return {
		id,
		startTime: mogi.startDate.getTime(),
		tier: mogi.roster.tier,
		isWar: mogi.roster.isWar,
		warTags: [...mogi.roster.warTags],
		players: [...mogi.roster].map(p => ({
			id: p.id,
			name: p.name,
			seed: p.seed,
			mmr: p.mmr,
			ign: p.rawIgn,
			substitutes: p.substitutes.map(s => ({ id: s.id, name: s.name, ign: s.rawIgn, joinedAt: s.joinedAt }))
		})),
		teams: mogi.teams.map(team => ({ seed: team.seed, index: team.index, tag: team.tag })),
		races: mogi.races.map(r => ({
			timestamp: r.timestamp,
			placements: r.placements.map(p => ({
				placement: p.placement,
				playerId: p.playerId,
				resolvedName: p.resolvedName,
				ocrText: p.ocrText,
				ocrConfidence: p.ocrConfidence,
				dc: p.dc
			})),
			gameScores: r.gameScores
		})),
		log: mogi.log,
		summary: {
			playersPerTeam: mogi.playersPerTeam,
			raceCount: mogi.size,
			ended: mogi.ended,
			standings: standings(mogi)
		}
	};
}

/**
 * Save the mogi every time it changes.
 * @param {Mogi} mogi
 * @param {string} id
 * @param {Set<string>} storedSnapshots keys of screenshots already in the database
 * @param {boolean} isSaved false for a new mogi, which is saved on its first update
 */
function keepSaved(mogi, id, storedSnapshots, isSaved) {
	let lastSaved = isSaved ? JSON.stringify(serialize(mogi, id)) : '';
	let warned = false;
	let queue = Promise.resolve();

	async function save() {
		const record = serialize(mogi, id);
		const json = JSON.stringify(record);
		if (json === lastSaved) return;

		// read screenshots before opening the transaction; it would close while waiting on fetch()
		const races = new Map(mogi.races.map(r => [snapshotKey(id, r.timestamp), r]));
		/** @type {[string, Blob][]} */
		const added = [];
		for (const [key, race] of races) {
			if (!storedSnapshots.has(key)) added.push([key, await (await fetch(race.snapshotUrl)).blob()]);
		}
		const removed = [...storedSnapshots].filter(key => !races.has(key));

		const tx = (await openDb()).transaction([MOGIS, SNAPSHOTS], 'readwrite');
		tx.objectStore(MOGIS).put({ ...record, updatedAt: Date.now() });
		for (const [key, blob] of added) tx.objectStore(SNAPSHOTS).put(blob, key);
		for (const key of removed) tx.objectStore(SNAPSHOTS).delete(key);
		await committed(tx);

		added.forEach(([key]) => storedSnapshots.add(key));
		removed.forEach(key => storedSnapshots.delete(key));
		lastSaved = json;
	}

	const saveSoon = () => {
		queue = queue.then(save).catch(err => {
			console.error('Could not save mogi', err);
			if (!warned) warning(t('savedMogis.saveFailed'));
			warned = true;
		});
	};
	mogi.addEventListener('update', saveSoon);
	mogi.addEventListener('log', saveSoon);
}

/** @returns {Promise<SavedMogi[]>} newest first */
export async function listSavedMogis() {
	const tx = (await openDb()).transaction(MOGIS, 'readonly');
	const all = /** @type {SavedMogi[]} */(await result(tx.objectStore(MOGIS).getAll()));
	return all.sort((a, b) => b.startTime - a.startTime);
}

/** @param {string} id */
export async function deleteSavedMogi(id) {
	const tx = (await openDb()).transaction([MOGIS, SNAPSHOTS], 'readwrite');
	tx.objectStore(MOGIS).delete(id);
	tx.objectStore(SNAPSHOTS).delete(allSnapshotsOf(id));
	await committed(tx);
}

/**
 * Start a new mogi and save it as it's played.
 * @param {Roster} roster
 * @returns {Promise<Session>}
 */
export async function startMogi(roster) {
	const mogi = new Mogi(roster);
	mogi.addLog({ level: 'info', race: null, key: 'mogiStarted' });
	const id = `${mogi.startDate.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	try {
		// Clear out mogis that never got a race in (the roster was pasted, then abandoned), and the oldest ones
		const saved = await listSavedMogis();
		const stale = saved.filter(m => m.races.length === 0).concat(saved.filter(m => m.races.length > 0).slice(MAX_SAVED - 1));
		for (const m of stale) await deleteSavedMogi(m.id);
	}
	catch (err) {
		console.error('Could not clean up saved mogis', err);
	}
	keepSaved(mogi, id, new Set(), false);
	return { id, mogi };
}

/**
 * Load a saved mogi to continue it (or look at its results), and keep saving changes to it.
 * @param {string} id
 * @returns {Promise<Session|null>} null if there is no such mogi
 */
export async function resumeMogi(id) {
	const db = await openDb();
	const record = /** @type {SavedMogi|undefined} */(await result(db.transaction(MOGIS, 'readonly').objectStore(MOGIS).get(id)));
	if (!record) return null;
	const snapshotStore = db.transaction(SNAPSHOTS, 'readonly').objectStore(SNAPSHOTS);
	const blobs = await Promise.all(record.races.map(r => result(snapshotStore.get(snapshotKey(id, r.timestamp)))));

	const players = record.players.map(p => {
		const player = new Player(p.id, p.name, p.seed, p.mmr);
		player.rawIgn = p.ign;
		for (const s of p.substitutes) {
			const sub = new Substitute(s.id, s.name, s.joinedAt);
			sub.rawIgn = s.ign;
			player.addSubstitute(sub);
		}
		return player;
	});
	/** @type {Set<string>} */
	const storedSnapshots = new Set();
	const races = record.races.map((r, i) => {
		const blob = blobs[i];
		if (blob instanceof Blob) storedSnapshots.add(snapshotKey(id, r.timestamp));
		const placements = r.placements.map(p => new Placement(p.placement, p.playerId, p.resolvedName, p.ocrText, p.ocrConfidence, p.dc));
		return new Race(r.timestamp, placements, blob instanceof Blob ? URL.createObjectURL(blob) : MISSING_SNAPSHOT, r.gameScores ?? []);
	});

	const mogi = new Mogi(Roster.restore(record, players), { startTime: record.startTime, races, log: record.log ?? [] });
	for (const saved of record.teams) {
		const team = mogi.teamBySeed(saved.seed);
		if (!team) continue;
		team.index = saved.index;
		team.tag = saved.tag;
	}
	keepSaved(mogi, id, storedSnapshots, true);
	mogi.addLog({ level: 'info', race: null, key: 'mogiReopened', vars: { count: mogi.size, total: RACE_COUNT } });
	return { id, mogi };
}
