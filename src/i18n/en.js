export default {
	_meta: {
		name: 'English',
		dir: 'ltr',
		code: 'en'
	},

	text: {
		title: "MKW Mogi Manager",
		loading: "Loading…",
		processing: "Processing…",
		save: "Save",
		confirm: "Confirm",
		cancel: "Cancel",
		blank: "—",
		landingPage: {
			lead: "Capture, OCR, score; right in your browser. No installs, no uploads.",
			features: [
				"Offline OCR",
				"Disconnect handler",
				"Manual resolve + edit",
				"Lounge export"
			],
			steps: [
				"**1.** Click __Get started__ and paste the 12-player roster (`1. Name (12345 MMR)`).",
				"**2.** Pick your virtual webcam in the preview area.",
				"**3.** After each race, hit __Capture & OCR__. We'll auto-match; if unsure, we'll ask.",
				"**4.** Fix anything via __Edit__ → __Save__. Export scores when done."
			],
			getStartedButton: "🚀 Get started",
			notesLabel: "Notes",
			notes: [
				"Race 1 must include all 12 players.",
				"10-player races are valid; 9 or fewer are a redo.",
				"Supports FFA, 2v2, 3v3, 4v4 and 6v6 Lounge Queue formats.",
				"Everything stays local in your browser.",
				"Auto-capture: captures automatically when the results screen appears, or when you take a screenshot on your Switch."
			],
			aboutLabel: "About",
			about: [
				"Made by [Niet](https://github.com/PFQNiet); Contributors: TechyAlex",
				"[View source on GitHub](https://github.com/PFQNiet/mkw-lounge-tracker)",
				"[Report a bug](https://github.com/PFQNiet/mkw-lounge-tracker/issues)"
			]
		},
		rosterSetup: {
			tierLabel: "Tier",
			tierHint: "Only needed if the pasted list has no “Tier” line",
			noTier: "No tier set: add it to the !submit line in the export before posting",
			title: "Roster setup",
			instructions: "Paste {count} players:",
			wrongLength: "Expected {count} players, got {actual}.",
			badLine: "Bad line: “{line}”",
			rosterLoaded: "Roster loaded!"
		},
		savedMogis: {
			empty: "No saved mogis yet.",
			backup: "⬇ Back up",
			restore: "⬆ Restore backup",
			backupDone: "Backup downloaded: keep the file somewhere safe",
			backupFailed: "Couldn't make the backup",
			restored: "{count} mogis restored from the backup",
			nothingToRestore: "Everything in that backup is already here",
			restoreFailed: "That file isn't a mogi backup",
			title: "Saved mogis",
			about: "Mogis are saved in this browser as you play, so you can pick up where you left off or come back for the results. The last {count} are kept.",
			resumeLast: "▶ Resume mogi ({count}/{total} races)",
			resume: "Resume",
			open: "Open",
			delete: "Delete",
			confirmDelete: "Delete this mogi? This can't be undone.",
			deleted: "Mogi deleted",
			inProgress: "In progress",
			finished: "Finished",
			races: "{count}/{total} races",
			ffa: "FFA",
			war: "War",
			tier: "Tier {tier}",
			resumed: "Mogi resumed ({count}/{total} races)",
			notFound: "Couldn't open that mogi.",
			saveFailed: "Couldn't save this mogi in the browser, so it won't be in your saved mogis."
		},
		log: {
			matchedByLooks: "Recognised {count} names that couldn't be read by how they looked in earlier races",
			feedLost: "The camera feed was lost (capture card unplugged, or OBS's virtual camera stopped): auto-capture can't see anything",
			feedFrozen: "The camera picture hasn't changed for 30 seconds: the feed seems frozen",
			feedBlack: "The camera picture has been black for 20 seconds: check the capture card and OBS",
			feedBack: "The camera feed is back",
			standingsMissed: "The standings after this race don't match the races recorded so far: its results screen seems to have been missed",
			markedRedo: "Removed as a redo race",
			totalsNowMatch: "After the edit, the in-game totals match the races",
			totalsStillWrong: "After the edit, the in-game totals still don't match: check race {races}",
			mogiComplete: "Mogi complete: all 12 races are in. Export the scores",
			title: "Log",
			titleWithProblems: "Log ({count} to check)",
			empty: "Nothing logged yet.",
			race: "Race {number}",
			mogiStarted: "Mogi started",
			mogiReopened: "Mogi reopened ({count}/{total} races)",
			savedAuto: "Saved (results screen detected)",
			savedScreenshot: "Saved (Switch screenshot)",
			savedManual: "Saved (Capture button)",
			askedToMatch: "Couldn't match {count} players' names; pick them on the PC",
			matchCancelled: "Picking names was cancelled, so the race wasn't saved",
			noScoreboard: "Couldn't read the results screen, so the race wasn't saved; capture it yourself",
			ocrFailed: "Reading the screen failed, so the race wasn't saved",
			notResultsScreen: "This doesn't look like the results screen (no +points column); it may be the standings, check this race",
			totalsOk: "In-game totals match the races so far",
			totalsUnknown: "Couldn't read enough totals to check the races so far",
			totalsWrong: "In-game totals don't match: check {races}. {details}",
			totalsMissed: "In-game totals are higher than expected: a race seems to be missing before this one (or a redo race wasn't noticed). {details}",
			totalsAfterRedo: "In-game totals include the redo race, so they couldn't be checked this time",
			redoRace: "Only {count} players on the results screen: this race gets redone, so it wasn't recorded",
			totalsDetail: "{name}: expected {expected}, game shows {shown}",
			raceRef: "race {number}",
			raceRange: "races {from}–{to}",
			raceEdited: "Race edited",
			raceDeleted: "Race deleted",
			tabHidden: "This tab was in the background for {duration}; auto-capture may have missed a race",
			screenshotIgnored: "Switch screenshot ignored: this race was already captured"
		},
		capture: {
			alreadyCapturing: "Already capturing; wait for it to finish",
			sounds: "Sounds",
			soundsOff: "Off",
			soundsAlerts: "Alerts",
			soundsAll: "Alerts + saved races",
			soundsNeedClick: "Click anywhere on this page to turn on alert sounds",
			camera: "Camera",
			noCameras: "(No cameras found)",
			selectCamera: "— Select camera —",
			cameraFallbackLabel: "Camera {deviceId}",
			cameraStopped: "Camera stopped",
			cameraStarted: "Camera started: {label}",
			cameraFailedToStart: "Could not start the selected camera",
			captureButton: "📸 Capture & OCR",
			localSaveReminder: "⚠️ Remember to always screenshot on Switch as well!",
			autoCaptureLabel: "Auto-capture",
			autoCaptureOff: "Off",
			autoCaptureSwitch: "On Switch screenshot",
			autoCaptureResults: "On results screen",
			autoCaptureBoth: "On results screen or screenshot",
			useOverlay: "Connect overlay",
			lastCapture: "Last capture",
			ocrResult: "OCR: “{ocrText}”",
			unresolved: "(unresolved)",
			maxRacesReached: "You have reached the maximum number of races.",
			captureCancelled: "Capture cancelled",
			noScoreboardDetected: "No scoreboard detected — try capturing on the results screen.",
			noPauseScreenDetected: "Auto-fill failed — ensure Pause screen is open with at least 10 players present.",
			ocrFailed: "OCR failed. See console for details.",
			raceSaved: "Race {number} saved!",
			alreadyCaptured: "This race was already captured."
		},
		overlay: {
			connected: "Overlay connected",
			failed: "Overlay connection failed",
			title: "Overlay connection",
			about: "The Overlay requires a bridge running on your computer.",
			firstTime: "If this is your first time using it, [follow these instructions](https://github.com/PFQNiet/mkw-lounge-tracker/blob/master/obs-companion/README.md) to get started.",
			instructions: "If you've done that, make sure the bridge is running. If you denied the browser permission to connect, you may need to clear that in your browser's site settings.",
			close: "Close"
		},
		manualResolution: {
			title: "Resolve unmatched players",
			selectPlayer: "— Select player —"
		},
		editRace: {
			redoButton: "Redo race",
			confirmRedo: "Remove this race because it's being redone? The game still counts it in its totals, so the totals check will allow for that.",
			title: "Edit race",
			instructions: "Select two players to swap them.",
			deleteRaceButton: "Delete race",
			confirmDelete: "Delete this race permanently?",
			disconnectedPlace: "DC",
			uniquePlacementError: "Each placement 1..12 can only be chosen once.",
			raceUpdated: "Race {number} updated!",
			raceDeleted: "Race {number} deleted!"
		},
		editRoster: {
			title: "Edit roster",
			team: "Team {id}",
			tag: "Tag",
			loungeName: "Lounge name",
			ingameName: "In-game name",
			substitute: "Substitute",
			autodetect: "(autodetect)",
			noSubstitute: "(none)",
			editSubButton: "Edit",
			autofill: "Auto-fill",
			rosterUpdated: "Roster updated!"
		},
		substitutePlayer: {
			title: "Substitute player",
			joinedAt: "Joined race #",
			newSubstitute: "New substitute",
			substituteUpdated: "Substitute updated!"
		},
		scoreboard: {
			suspectWrong: "The in-game totals say this race looks wrong",
			suspectMissedBefore: "The in-game totals say a race is missing before this one",
			title: "Scoreboard",
			team: "Team",
			player: "Player",
			raceNumber: "R{number}",
			total: "Total",
			editRosterButton: "Edit roster",
			newSessionButton: "🧹 New session",
			snapshotScoresButton: "🖼️ Snapshot",
			downloadZipButton: "📦 Download ZIP",
			exportScoresButton: "📤 Export scores"
		},
		exportScores: {
			title: "Export scores",
			format: "Format",
			qFormat: "Lounge Queue",
			sqFormat: "Squad Queue",
			close: "Close",
			copy: "Copy",
			copiedToClipboard: "Copied to clipboard!",
			failedToCopy: "Failed to copy to clipboard, press Ctrl/Cmd+C to copy manually."
		},
		gallery: {
			title: "Race history",
			imageAltText: "Race {number} snapshot",
			imageCaption: "Race {number} · {time}"
		}
	},

	format: {
		/** @param {number} n */
		ordinal(n) {
			const ruleset = new Intl.PluralRules('en', { type: 'ordinal' });
			switch (ruleset.select(n)) {
				case 'one': return 'st';
				case 'two': return 'nd';
				case 'few': return 'rd';
				default: return 'th';
			}
		},
		/** @param {number} n */
		place(n) {
			// Prepend a FIGURE SPACE for single-digit numbers so they align with 10+ in mono/tabular fonts.
			return `${n < 10 ? '\u2007' : ''}${n}${this.ordinal(n)}`;
		},

		/** @param {number} n */
		number(n) { return n.toLocaleString('en'); },
		/** @param {Date} d */
		time(d) { return d.toLocaleTimeString('en', { timeStyle: 'short' }); }
	}
};
