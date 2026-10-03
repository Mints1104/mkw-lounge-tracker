export default {
	_meta: {
		name: 'Français',
		dir: 'ltr',
		code: 'fr'
	},

	text: {
		title: "Mogi Manager MKW",
		loading: "Chargement…",
		processing: "Traitement…",
		save: "Enregistrer",
		confirm: "Confirmer",
		cancel: "Annuler",
		blank: "—",

		landingPage: {
			lead: "Capture, OCR, score ; directement dans votre navigateur. Aucun logiciel à installer, aucun envoi.",
			features: [
				"OCR hors ligne",
				"Gestion des déconnexions",
				"Résolution manuelle + édition",
				"Export Lounge"
			],
			steps: [
				"**1.** Cliquez sur __Commencer__ et collez la liste des 12 joueurs (`1. Nom (12345 MMR)`).",
				"**2.** Choisissez votre webcam virtuelle dans l'aperçu.",
				"**3.** Après chaque course, appuyez sur __Capturer & OCR__. Appariage automatique ; en cas de doute, on vous demandera.",
				"**4.** Corrigez via __Modifier__ → __Enregistrer__. Exportez les scores quand c'est fini."
			],
			getStartedButton: "🚀 Commencer",
			notesLabel: "Notes",
			notes: [
				"La course 1 doit inclure les 12 joueurs.",
				"Les courses à 10 joueurs sont valides ; 9 ou moins ⇒ à refaire.",
				"Prend en charge les formats FFA, 2v2, 3v3, 4v4 et 6v6 de la file Lounge.",
				"Tout reste local dans votre navigateur.",
				"Auto-capture : capture automatiquement dès que l'écran des résultats s'affiche, ou quand vous faites une capture d'écran sur la Switch."
			],
			aboutLabel: "À propos",
			about: [
				"Créé par [Niet](https://github.com/PFQNiet) ; contributeurs : TechyAlex",
				"[Voir le code source sur GitHub](https://github.com/PFQNiet/mkw-lounge-tracker)",
				"[Signaler un bug](https://github.com/PFQNiet/mkw-lounge-tracker/issues)"
			]
		},

		rosterSetup: {
			tierLabel: "Tier",
			tierHint: "Seulement si la liste collée n'a pas de ligne « Tier »",
			noTier: "Aucun tier défini : ajoutez-le à la ligne !submit de l'export avant de poster",
			title: "Configuration de la liste",
			instructions: "Collez {count} joueurs :",
			wrongLength: "{count} joueurs attendus, {actual} trouvés.",
			badLine: "Ligne invalide : « {line} »",
			rosterLoaded: "Liste chargée !"
		},

		savedMogis: {
			empty: "Aucun mogi enregistré pour l'instant.",
			backup: "⬇ Sauvegarder",
			restore: "⬆ Restaurer une sauvegarde",
			backupDone: "Sauvegarde téléchargée : gardez le fichier en lieu sûr",
			backupFailed: "Impossible de créer la sauvegarde",
			restored: "{count} mogis restaurés depuis la sauvegarde",
			nothingToRestore: "Tout le contenu de cette sauvegarde est déjà là",
			restoreFailed: "Ce fichier n'est pas une sauvegarde de mogis",
			title: "Mogis enregistrés",
			about: "Les mogis sont enregistrés dans ce navigateur pendant que vous jouez : vous pouvez reprendre là où vous en étiez ou revenir chercher les résultats. Les {count} derniers sont conservés.",
			resumeLast: "▶ Reprendre le mogi ({count}/{total} courses)",
			resume: "Reprendre",
			open: "Ouvrir",
			delete: "Supprimer",
			confirmDelete: "Supprimer ce mogi ? Cette action est irréversible.",
			deleted: "Mogi supprimé",
			inProgress: "En cours",
			finished: "Terminé",
			races: "{count}/{total} courses",
			ffa: "FFA",
			war: "War",
			tier: "Tier {tier}",
			resumed: "Mogi repris ({count}/{total} courses)",
			notFound: "Impossible d'ouvrir ce mogi.",
			saveFailed: "Impossible d'enregistrer ce mogi dans le navigateur : il n'apparaîtra pas dans les mogis enregistrés."
		},
		log: {
			matchedByLooks: "{count} noms illisibles reconnus d'après leur apparence dans les courses précédentes",
			feedLost: "Le flux de la caméra est perdu (carte de capture débranchée ou caméra virtuelle d'OBS arrêtée) : l'auto-capture ne voit plus rien",
			feedFrozen: "L'image de la caméra n'a pas changé depuis 30 secondes : le flux semble figé",
			feedBlack: "L'image de la caméra est noire depuis 20 secondes : vérifiez la carte de capture et OBS",
			feedBack: "Le flux de la caméra est revenu",
			standingsMissed: "Le classement après cette course ne correspond pas aux courses enregistrées : son écran des résultats semble avoir été manqué",
			markedRedo: "Retirée comme course rejouée",
			totalsNowMatch: "Après la modification, les totaux du jeu correspondent aux courses",
			totalsStillWrong: "Après la modification, les totaux du jeu ne correspondent toujours pas : vérifiez la course {races}",
			mogiComplete: "Mogi terminé : les 12 courses sont enregistrées. Exportez les scores",
			title: "Journal",
			titleWithProblems: "Journal ({count} à vérifier)",
			empty: "Rien pour l'instant.",
			race: "Course {number}",
			mogiStarted: "Mogi commencé",
			mogiReopened: "Mogi rouvert ({count}/{total} courses)",
			savedAuto: "Enregistrée (écran des résultats détecté)",
			savedScreenshot: "Enregistrée (capture d'écran Switch)",
			savedManual: "Enregistrée (bouton Capturer)",
			askedToMatch: "{count} noms n'ont pas pu être associés ; choisissez-les sur le PC",
			matchCancelled: "Association des noms annulée, la course n'a pas été enregistrée",
			noScoreboard: "Impossible de lire l'écran des résultats, la course n'a pas été enregistrée ; capturez-la vous-même",
			ocrFailed: "La lecture de l'écran a échoué, la course n'a pas été enregistrée",
			notResultsScreen: "Ceci ne ressemble pas à l'écran des résultats (pas de colonne +points) ; c'est peut-être le classement, vérifiez cette course",
			totalsOk: "Les totaux du jeu correspondent aux courses enregistrées",
			totalsUnknown: "Pas assez de totaux lisibles pour vérifier les courses enregistrées",
			totalsWrong: "Les totaux du jeu ne correspondent pas : vérifiez {races}. {details}",
			totalsMissed: "Les totaux du jeu sont plus élevés que prévu : une course semble manquer avant celle-ci (ou une course rejouée n'a pas été détectée). {details}",
			totalsAfterRedo: "Les totaux du jeu incluent la course rejouée, ils n'ont donc pas pu être vérifiés cette fois",
			redoRace: "Seulement {count} joueurs sur l'écran des résultats : cette course sera rejouée, elle n'a donc pas été enregistrée",
			totalsDetail: "{name} : attendu {expected}, le jeu affiche {shown}",
			raceRef: "la course {number}",
			raceRange: "les courses {from}–{to}",
			raceEdited: "Course modifiée",
			raceDeleted: "Course supprimée",
			tabHidden: "Cet onglet était en arrière-plan pendant {duration} ; l'auto-capture a peut-être manqué une course",
			screenshotIgnored: "Capture d'écran Switch ignorée : cette course est déjà enregistrée"
		},
		capture: {
			alreadyCapturing: "Capture déjà en cours ; patientez",
			sounds: "Sons",
			soundsOff: "Désactivés",
			soundsAlerts: "Alertes",
			soundsAll: "Alertes + courses enregistrées",
			soundsNeedClick: "Cliquez n'importe où sur cette page pour activer les sons d'alerte",
			camera: "Caméra",
			noCameras: "(Aucune caméra trouvée)",
			selectCamera: "— Sélectionner une caméra —",
			cameraFallbackLabel: "Caméra {deviceId}",
			cameraStopped: "Caméra arrêtée",
			cameraStarted: "Caméra démarrée : {label}",
			cameraFailedToStart: "Impossible de démarrer la caméra sélectionnée",
			captureButton: "📸 Capturer & OCR",
			localSaveReminder: "⚠️ Pensez aussi à faire une capture d'écran sur la Switch !",
			autoCaptureLabel: "Auto-capture",
			autoCaptureOff: "Désactivée",
			autoCaptureSwitch: "À la capture d'écran Switch",
			autoCaptureResults: "À l'écran des résultats",
			autoCaptureBoth: "À l'écran des résultats ou capture",
			useOverlay: "Connecter l'overlay",
			lastCapture: "Dernière capture",
			ocrResult: "OCR : « {ocrText} »",
			unresolved: "(non résolu)",
			maxRacesReached: "Nombre maximal de courses atteint.",
			captureCancelled: "Capture annulée",
			noScoreboardDetected: "Aucun tableau de scores détecté — capturez l'écran des résultats.",
			noPauseScreenDetected: "Échec du remplissage automatique — ouvrez l'écran Pause avec au moins 10 joueurs présents.",
			ocrFailed: "Échec de l'OCR. Voir la console pour plus de détails.",
			raceSaved: "Course {number} enregistrée !",
			alreadyCaptured: "Cette course a déjà été capturée."
		},

		overlay: {
			connected: "Overlay connecté",
			failed: "Échec de la connexion à l'overlay",
			title: "Connexion de l'overlay",
			about: "L'overlay nécessite un programme relais en cours d'exécution sur votre ordinateur.",
			firstTime: "Si c'est votre première utilisation, [suivez ces instructions](https://github.com/PFQNiet/mkw-lounge-tracker/blob/master/obs-companion/README.md) pour commencer.",
			instructions: "Si c'est déjà fait, assurez-vous que le relais est en cours d'exécution. Si vous avez refusé l'autorisation du navigateur, vous devrez peut-être la réactiver dans les paramètres du site.",
			close: "Fermer"
		},

		manualResolution: {
			title: "Résoudre les joueurs non appariés",
			selectPlayer: "— Sélectionner un joueur —"
		},

		editRace: {
			redoButton: "Course rejouée",
			confirmRedo: "Retirer cette course parce qu'elle est rejouée ? Le jeu la compte toujours dans ses totaux ; la vérification des totaux en tiendra compte.",
			title: "Modifier la course",
			instructions: "Sélectionnez deux joueurs à permuter.",
			deleteRaceButton: "Supprimer la course",
			confirmDelete: "Supprimer définitivement cette course ?",
			disconnectedPlace: "DC",
			uniquePlacementError: "Chaque place 1..12 ne peut être choisie qu'une seule fois.",
			raceUpdated: "Course {number} mise à jour !",
			raceDeleted: "Course {number} supprimée !"
		},

		editRoster: {
			title: "Modifier la liste",
			team: "Équipe {id}",
			tag: "Tag",
			loungeName: "Nom Lounge",
			ingameName: "Nom en jeu",
			substitute: "Remplaçant",
			autodetect: "(détection auto)",
			noSubstitute: "(aucun)",
			editSubButton: "Modifier",
			autofill: "Remplir auto.",
			rosterUpdated: "Liste mise à jour !"
		},

		substitutePlayer: {
			title: "Remplacer un joueur",
			joinedAt: "A rejoint à la course n°",
			newSubstitute: "Nouveau remplaçant",
			substituteUpdated: "Remplaçant mis à jour !"
		},

		scoreboard: {
			suspectWrong: "D'après les totaux du jeu, cette course semble incorrecte",
			suspectMissedBefore: "D'après les totaux du jeu, il manque une course avant celle-ci",
			title: "Classement",
			team: "Équipe",
			player: "Joueur",
			raceNumber: "C{number}",
			total: "Total",
			editRosterButton: "Modifier la liste",
			newSessionButton: "🧹 Nouvelle session",
			snapshotScoresButton: "🖼️ Capture",
			downloadZipButton: "📦 Télécharger le ZIP",
			exportScoresButton: "📤 Exporter les scores"
		},

		exportScores: {
			title: "Exporter les scores",
			format: "Format",
			close: "Fermer",
			copy: "Copier",
			copiedToClipboard: "Copié !",
			failedToCopy: "Échec de la copie, utilisez Ctrl/Cmd+C pour copier manuellement."
		},

		gallery: {
			title: "Historique des courses",
			imageAltText: "Capture de la course {number}",
			imageCaption: "Course {number} · {time}"
		}
	},

	format: {
		/** @param {number} n */
		ordinal(n) {
			// FR ordinals: 1er, then 2e, 3e, …; we'll add a FIGURE SPACE for mono alignment on other places.
			return `e${n === 1 ? 'r' : '\u2007'}`;
		},
		/** @param {number} n */
		place(n) {
			// Prepend a FIGURE SPACE for single-digit numbers so they align with 10+ in mono/tabular fonts.
			return `${n < 10 ? '\u2007' : ''}${n}${this.ordinal(n)}`;
		},

		/** @param {number} n */
		number(n) { return n.toLocaleString('fr'); },
		/** @param {Date} d */
		time(d) { return d.toLocaleTimeString('fr', { timeStyle: 'short' }); }
	}
};
