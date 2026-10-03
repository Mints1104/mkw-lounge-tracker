export default {
	_meta: {
		name: 'Deutsch',
		dir: 'ltr',
		code: 'de'
	},

	text: {
		title: "MKW Mogi Manager",
		loading: "Wird geladen…",
		processing: "Wird verarbeitet…",
		save: "Speichern",
		confirm: "Bestätigen",
		cancel: "Abbrechen",
		blank: "—",

		landingPage: {
			lead: "Capture, OCR, Punkte ; direkt im Browser. Keine Installation, kein Upload.",
			features: [
				"Offline-OCR",
				"DC-Handling",
				"Manuelle Zuordnung & Bearbeitung",
				"Lounge-Export"
			],
			steps: [
				"**1.** Klicke **Los geht's** und füge die 12-Spieler-Liste ein (`1. Name (12345 MMR)`)",
				"**2.** Wähle deine virtuelle Webcam in der Vorschau.",
				"**3.** Nach jedem Rennen **Aufnehmen & OCR** drücken. Zuordnung passiert automatisch; bei Unsicherheit wirst du gefragt.",
				"**4.** Korrigiere über **Bearbeiten** → **Speichern**. Am Ende Punkte exportieren."
			],
			getStartedButton: "🚀 Los geht's",
			notesLabel: "Hinweise",
			notes: [
				"Rennen 1 muss alle 12 Spieler enthalten.",
				"10-Spieler-Rennen sind gültig; 9 oder weniger ⇒ Neustart.",
				"Unterstützt FFA-, 2v2-, 3v3-, 4v4- und 6v6-Lounge-Queue-Formate.",
				"Alles bleibt lokal in deinem Browser.",
				"Auto-Capture: nimmt automatisch auf, sobald der Ergebnisbildschirm erscheint oder du auf der Switch einen Screenshot machst."
			],
			aboutLabel: "Über",
			about: [
				"Erstellt von [Niet](https://github.com/PFQNiet) ; Mitwirkende: TechyAlex",
				"[Quellcode auf GitHub ansehen](https://github.com/PFQNiet/mkw-lounge-tracker)",
				"[Bug melden](https://github.com/PFQNiet/mkw-lounge-tracker/issues)"
			]
		},

		rosterSetup: {
			tierLabel: "Tier",
			tierHint: "Nur nötig, wenn die eingefügte Liste keine „Tier“-Zeile hat",
			noTier: "Kein Tier angegeben: ergänze es vor dem Posten in der !submit-Zeile im Export",
			title: "Spielerliste einrichten",
			instructions: "Füge {count} Spieler ein:",
			wrongLength: "Erwartet: {count} Spieler, erhalten: {actual}.",
			badLine: "Ungültige Zeile: „{line}“",
			rosterLoaded: "Liste geladen!"
		},

		savedMogis: {
			empty: "Noch keine gespeicherten Mogis.",
			backup: "⬇ Sichern",
			restore: "⬆ Sicherung laden",
			backupDone: "Sicherung heruntergeladen: bewahre die Datei gut auf",
			backupFailed: "Die Sicherung konnte nicht erstellt werden",
			restored: "{count} Mogis aus der Sicherung wiederhergestellt",
			nothingToRestore: "Alles aus dieser Sicherung ist schon da",
			restoreFailed: "Diese Datei ist keine Mogi-Sicherung",
			title: "Gespeicherte Mogis",
			about: "Mogis werden beim Spielen in diesem Browser gespeichert, damit du dort weitermachen kannst, wo du aufgehört hast, oder später die Ergebnisse abrufen kannst. Die letzten {count} werden aufbewahrt.",
			resumeLast: "▶ Mogi fortsetzen ({count}/{total} Rennen)",
			resume: "Fortsetzen",
			open: "Öffnen",
			delete: "Löschen",
			confirmDelete: "Diesen Mogi löschen? Das kann nicht rückgängig gemacht werden.",
			deleted: "Mogi gelöscht",
			inProgress: "Läuft",
			finished: "Beendet",
			races: "{count}/{total} Rennen",
			ffa: "FFA",
			war: "War",
			tier: "Tier {tier}",
			resumed: "Mogi fortgesetzt ({count}/{total} Rennen)",
			notFound: "Dieser Mogi konnte nicht geöffnet werden.",
			saveFailed: "Dieser Mogi konnte nicht im Browser gespeichert werden und erscheint daher nicht unter den gespeicherten Mogis."
		},
		log: {
			matchedByLooks: "{count} unlesbare Namen anhand ihres Aussehens in früheren Rennen erkannt",
			feedLost: "Das Kamerabild ist weg (Capture-Karte getrennt oder virtuelle OBS-Kamera gestoppt): Auto-Capture sieht nichts mehr",
			feedFrozen: "Das Kamerabild hat sich seit 30 Sekunden nicht verändert: es scheint eingefroren",
			feedBlack: "Das Kamerabild ist seit 20 Sekunden schwarz: prüfe Capture-Karte und OBS",
			feedBack: "Das Kamerabild ist wieder da",
			standingsMissed: "Die Gesamtwertung nach diesem Rennen passt nicht zu den erfassten Rennen: sein Ergebnisbildschirm wurde anscheinend verpasst",
			markedRedo: "Als wiederholtes Rennen entfernt",
			totalsNowMatch: "Nach der Bearbeitung passen die Punktestände im Spiel zu den Rennen",
			totalsStillWrong: "Nach der Bearbeitung passen die Punktestände im Spiel immer noch nicht: prüfe Rennen {races}",
			mogiComplete: "Mogi beendet: alle 12 Rennen sind erfasst. Exportiere die Ergebnisse",
			title: "Protokoll",
			titleWithProblems: "Protokoll ({count} zu prüfen)",
			empty: "Noch keine Einträge.",
			race: "Rennen {number}",
			mogiStarted: "Mogi gestartet",
			mogiReopened: "Mogi wieder geöffnet ({count}/{total} Rennen)",
			savedAuto: "Gespeichert (Ergebnisbildschirm erkannt)",
			savedScreenshot: "Gespeichert (Switch-Screenshot)",
			savedManual: "Gespeichert (Aufnehmen-Knopf)",
			askedToMatch: "{count} Namen konnten nicht zugeordnet werden; wähle sie am PC aus",
			matchCancelled: "Namenszuordnung abgebrochen, das Rennen wurde nicht gespeichert",
			noScoreboard: "Der Ergebnisbildschirm konnte nicht gelesen werden, das Rennen wurde nicht gespeichert; nimm es selbst auf",
			ocrFailed: "Lesen des Bildschirms fehlgeschlagen, das Rennen wurde nicht gespeichert",
			notResultsScreen: "Das sieht nicht nach dem Ergebnisbildschirm aus (keine +Punkte-Spalte); evtl. die Gesamtwertung, prüfe dieses Rennen",
			totalsOk: "Die Punktestände im Spiel passen zu den bisherigen Rennen",
			totalsUnknown: "Zu wenige Punktestände lesbar, um die bisherigen Rennen zu prüfen",
			totalsWrong: "Die Punktestände im Spiel passen nicht: prüfe {races}. {details}",
			totalsMissed: "Die Punktestände im Spiel sind höher als erwartet: vor diesem Rennen scheint eines zu fehlen (oder ein wiederholtes Rennen wurde nicht erkannt). {details}",
			totalsAfterRedo: "Die Punktestände im Spiel enthalten das wiederholte Rennen und konnten diesmal nicht geprüft werden",
			redoRace: "Nur {count} Spieler auf dem Ergebnisbildschirm: dieses Rennen wird wiederholt und wurde daher nicht gespeichert",
			totalsDetail: "{name}: erwartet {expected}, Spiel zeigt {shown}",
			raceRef: "Rennen {number}",
			raceRange: "Rennen {from}–{to}",
			raceEdited: "Rennen bearbeitet",
			raceDeleted: "Rennen gelöscht",
			tabHidden: "Dieser Tab war {duration} im Hintergrund; Auto-Capture hat evtl. ein Rennen verpasst",
			screenshotIgnored: "Switch-Screenshot ignoriert: dieses Rennen ist bereits aufgenommen"
		},
		capture: {
			alreadyCapturing: "Es wird bereits aufgenommen; bitte warten",
			sounds: "Töne",
			soundsOff: "Aus",
			soundsAlerts: "Warnungen",
			soundsAll: "Warnungen + gespeicherte Rennen",
			soundsNeedClick: "Klicke irgendwo auf diese Seite, um die Warntöne zu aktivieren",
			camera: "Kamera",
			noCameras: "(Keine Kamera gefunden)",
			selectCamera: "— Kamera auswählen —",
			cameraFallbackLabel: "Kamera {deviceId}",
			cameraStopped: "Kamera gestoppt",
			cameraStarted: "Kamera gestartet: {label}",
			cameraFailedToStart: "Ausgewählte Kamera konnte nicht gestartet werden",
			captureButton: "📸 Aufnehmen & OCR",
			localSaveReminder: "⚠️ Mache zusätzlich einen Screenshot auf der Switch!",
			autoCaptureLabel: "Auto-Capture",
			autoCaptureOff: "Aus",
			autoCaptureSwitch: "Bei Switch-Screenshot",
			autoCaptureResults: "Beim Ergebnisbildschirm",
			autoCaptureBoth: "Bei Ergebnisbildschirm oder Screenshot",
			useOverlay: "Overlay verbinden",
			lastCapture: "Letzte Aufnahme",
			ocrResult: "OCR: „{ocrText}“",
			unresolved: "(nicht zugeordnet)",
			maxRacesReached: "Maximale Anzahl Rennen erreicht.",
			captureCancelled: "Aufnahme abgebrochen",
			noScoreboardDetected: "Kein Ergebnisscreen erkannt — bitte den Ergebnisscreen erfassen.",
			noPauseScreenDetected: "Automatisches Ausfüllen fehlgeschlagen — bitte den Pausebildschirm mit mindestens 10 anwesenden Spielern öffnen.",
			ocrFailed: "OCR fehlgeschlagen. Details in der Konsole.",
			raceSaved: "Rennen {number} gespeichert!",
			alreadyCaptured: "Dieses Rennen wurde bereits aufgenommen."
		},

		overlay: {
			connected: "Overlay verbunden",
			failed: "Overlay-Verbindung fehlgeschlagen",
			title: "Overlay-Verbindung",
			about: "Das Overlay benötigt eine Bridge, die auf deinem Computer läuft.",
			firstTime: "Wenn du es zum ersten Mal benutzt, [folge diesen Anweisungen](https://github.com/PFQNiet/mkw-lounge-tracker/blob/master/obs-companion/README.md), um zu beginnen.",
			instructions: "Wenn du das bereits getan hast, stelle sicher, dass die Bridge läuft. Falls du dem Browser die Verbindung zu localhost verweigert hast, musst du diese Berechtigung möglicherweise in den Website-Einstellungen zurücksetzen.",
			close: "Schließen"
		},

		manualResolution: {
			title: "Nicht zugeordnete Spieler auflösen",
			selectPlayer: "— Spieler auswählen —"
		},

		editRace: {
			redoButton: "Rennen wiederholt",
			confirmRedo: "Dieses Rennen entfernen, weil es wiederholt wird? Das Spiel zählt es weiter in seinen Punkteständen mit; die Punkteprüfung berücksichtigt das.",
			title: "Rennen bearbeiten",
			instructions: "Wähle zwei Spieler zum Tauschen aus.",
			deleteRaceButton: "Rennen löschen",
			confirmDelete: "Dieses Rennen endgültig löschen?",
			disconnectedPlace: "DC",
			uniquePlacementError: "Jede Platzierung 1..12 darf nur einmal gewählt werden.",
			raceUpdated: "Rennen {number} aktualisiert!",
			raceDeleted: "Rennen {number} gelöscht!"
		},

		editRoster: {
			title: "Liste bearbeiten",
			team: "Team {id}",
			tag: "Tag",
			loungeName: "Lounge-Name",
			ingameName: "In-Game-Name",
			substitute: "Ersatzspieler",
			autodetect: "(automatisch erkannt)",
			noSubstitute: "(kein)",
			editSubButton: "Bearbeiten",
			autofill: "Auto-füllen",
			rosterUpdated: "Liste aktualisiert!"
		},

		substitutePlayer: {
			title: "Spieler ersetzen",
			joinedAt: "Eingestiegen ab Rennen Nr.",
			newSubstitute: "Neuer Ersatzspieler",
			substituteUpdated: "Ersatzspieler aktualisiert!"
		},

		scoreboard: {
			suspectWrong: "Laut den Punkteständen im Spiel scheint dieses Rennen falsch",
			suspectMissedBefore: "Laut den Punkteständen im Spiel fehlt vor diesem Rennen eines",
			title: "Rangliste",
			team: "Team",
			player: "Spieler",
			raceNumber: "R{number}",
			total: "Gesamt",
			editRosterButton: "Liste bearbeiten",
			newSessionButton: "🧹 Neue Session",
			snapshotScoresButton: "🖼️ Schnappschuss",
			downloadZipButton: "📦 ZIP herunterladen",
			exportScoresButton: "📤 Punkte exportieren"
		},

		exportScores: {
			title: "Punkte exportieren",
			format: "Format",
			close: "Schließen",
			copy: "Kopieren",
			copiedToClipboard: "Kopiert!",
			failedToCopy: "Kopieren fehlgeschlagen — mit Strg/Cmd+C manuell kopieren."
		},

		gallery: {
			title: "Rennhistorie",
			imageAltText: "Screenshot Rennen {number}",
			imageCaption: "Rennen {number} · {time}"
		}
	},

	format: {
		ordinal() {
			// Deutsche Ordinale: „1.“ „2.“ „3.“ …
			return '.';
		},
		/** @param {number} n */
		place(n) {
			// Pad single digits with FIGURE SPACE so „2.“ aligns with „10.“ in Mono/Tabular
			return `${n < 10 ? '\u2007' : ''}${n}.`;
		},
		/** @param {number} n */
		number(n) { return n.toLocaleString('de'); },
		/** @param {Date} d */
		time(d) { return d.toLocaleTimeString('de', { timeStyle: 'short' }); }
	}
};
