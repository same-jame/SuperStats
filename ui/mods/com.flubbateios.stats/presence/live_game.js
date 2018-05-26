ko.computed(function () {
	var gameType = model.gameOptions.game_type();
	if (!gameType) {
		return;
	}
	var isSpectator = model.isSpectator();
	var wasAlwaysSpectating = model.playerWasAlwaysSpectating();
	var viewReplay = model.viewReplay();
	var defeated = model.defeated();
	var gameOver = model.gameOver();
	var paused = model.paused();
	var loading = model.showGameLoading();
	var landing = model.showLanding();
	var serverMode = model.serverMode();
	var serverMode = model.serverMode();
	var isTeamGame = model.gameOptions.isTeamArmy();
	var type = gameType;
	switch (gameType) {
	case 'FreeForAll':
		type = 'FFA';
		break;
	case 'TeamArmies':
		type = 'Team';
		break;
	case 'Galactic War':
		type = 'GW';
		break;
	case 'Ladder1v1':
		type = 'Ranked';
		break;
	}
	var system = model.systemName();
	var armies = model.players();
	var armyCount = playerCount = armies.length;
	var format = '';
	if (isTeamGame) {
		var shared = false;
		var counts = [];
		var alliances = {};
		_.forEach(armies, function (army) {
			var slotCount = army.slots.length;

			if (slotCount > 1) {
				shared = true;
				counts.push(slotCount);
				playerCount = playerCount + slotCount - 1;
			} else {
				var allianceCount = alliances[army.alliance_group];

				alliances[army.alliance_group] = (allianceCount ? allianceCount : 0) + slotCount;
			}
		});
		counts = counts.concat(_.values(alliances));
		if (playerCount > 2) {
			format = counts.join('v');
		}
	} else if (playerCount > 1) {
		if (playerCount == 2) {
			format = '1v1';
			if (type == 'Ranked') {
				format = format + ' ' + type;
			}
		} else {
			format = playerCount + ' ' + type;
		}
	}
	role = 'Playing';
	if (!serverMode) {
		role = 'Loading';
	} else if (viewReplay) {
		role = 'Reviewing';
	} else if (wasAlwaysSpectating) {
		role = 'Spectating';
	} else if (defeated && !gameOver) {
		role = 'Died & spectating';
	} else if (defeated && gameOver) {
		if (armyCount == 2) {
			role = 'Lost & reviewing';
		} else {
			role = 'Died & reviewing';
		}
	} else if (!defeated && gameOver) {
		role = 'Won & reviewing';
	}
	var systemDisplay = '';
	if (system) {
		if (loading) {
			systemDisplay = ' loading ' + system;
		} else if (landing) {
			systemDisplay = ' landing on ' + system;
		} else {
			systemDisplay = ' on ' + system;
		}
	}
	var status = role + (format ? ' ' + format : '') + systemDisplay;
	if (role == 'Playing' && paused) {
		status = status + ' (paused)';
	}
	var state = {
		scene: 'live_game',
		text: status
	}
	api.Panel.message('uberbar', 'superStatsPresence', state);
});
