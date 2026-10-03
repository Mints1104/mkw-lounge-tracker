export const POINTS_BY_PLACEMENT = [15,12,10,9,8,7,6,5,4,3,2,1];

export class Placement {
	/** @type {number} */ #placement;
	get placement() { return this.#placement; }

	/** @type {(string|null)} */ #playerId;
	get playerId() { return this.#playerId; }

	/** @type {string} */ #resolvedName;
	get resolvedName() { return this.#resolvedName; }

	/** @type {string} */ #ocrText;
	get ocrText() { return this.#ocrText; }

	/** @type {number} */ #ocrConfidence;
	get ocrConfidence() { return this.#ocrConfidence; }

	/** @type {boolean} */ #dc;
	get dc() { return this.#dc; }

	/**
	 * @param {number} placement
	 * @param {(string|null)} playerId
	 * @param {string} resolvedName
	 * @param {string} ocrText
	 * @param {number} ocrConfidence
	 * @param {boolean} dc
	 */
	constructor(placement, playerId, resolvedName, ocrText, ocrConfidence, dc) {
		this.#placement = placement;
		this.#playerId = playerId;
		this.#resolvedName = resolvedName;
		this.#ocrText = ocrText;
		this.#ocrConfidence = ocrConfidence;
		this.#dc = dc;
	}

	/**
	 * @param {string|null} playerId
	 * @param {string} resolvedName
	 */
	withPlayerIdAndResolvedName(playerId, resolvedName) {
		return new Placement(this.#placement, playerId, resolvedName, this.#ocrText, this.#ocrConfidence, this.#dc);
	}

	/**
	 * @param {number} placement
	 * @param {boolean} dc
	 */
	withPlacement(placement, dc) {
		return new Placement(placement, this.#playerId, this.#resolvedName, this.#ocrText, this.#ocrConfidence, dc);
	}

	get score() {
		if (this.#dc) return 1;
		return POINTS_BY_PLACEMENT[this.#placement - 1] ?? 0;
	}
}

/**
 * What the game showed for a place on the results screen.
 * @typedef {Object} GameScore
 * @prop {number|null} points points for this race ("+N")
 * @prop {number|null} total total before this race
 */

export class Race {
	/** @type {number} */ #timestamp;
	get timestamp() { return this.#timestamp; }

	/** @type {Placement[]} */ #placements;
	get placements() { return [...this.#placements]; }

	/** @type {string} */ #snapshotUrl;
	get snapshotUrl() { return this.#snapshotUrl; }

	/** @type {GameScore[]} */ #gameScores;
	/** What the game showed for each place, by placement - 1; empty if it wasn't read */
	get gameScores() { return [...this.#gameScores]; }

	/**
	 * @param {number} timestamp
	 * @param {Placement[]} placements
	 * @param {string} snapshotUrl
	 * @param {GameScore[]} [gameScores]
	 */
	constructor(timestamp, placements, snapshotUrl, gameScores = []) {
		this.#timestamp = timestamp;
		this.#placements = placements;
		this.#snapshotUrl = snapshotUrl;
		this.#gameScores = gameScores;
	}

	/** @param {Placement[]} placements */
	withPlacements(placements) {
		return new Race(this.#timestamp, placements, this.#snapshotUrl, this.#gameScores);
	}

	/** @returns {Map<string,number>} Player ID => Score */
	calculatePlayerScores() {
		const scores = new Map();
		for (const placement of this.#placements) {
			const playerId = placement.playerId;
			if (!playerId) continue;
			const score = scores.get(playerId) ?? 0;
			scores.set(playerId, score + placement.score);
		}
		return scores;
	}
}
