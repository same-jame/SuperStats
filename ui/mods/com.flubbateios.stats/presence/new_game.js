!function() {
	//FROM pa chat
	model.lobbyFormat = ko.computed(function() {
		var format = '';
		try {
			var gameType = model.gameType();
			var isTeamGame = model.isTeamGame();
			var players = model.playerCount();
			var armies = model.armies();

			switch (gameType) {
				case 'FreeForAll':
					gameType = 'FFA';
					break;
				case 'TeamArmies':
					gameType = 'Team';
					break;
				case 'Galactic War':
					gameType = 'GW';
					break;
				case 'Ladder1v1':
					gameType = 'Ranked';
					break;
			}
			if (players > 1) {
				if (players == 2) {
					format = '1v1';
					if (gameType == 'Ranked') {
						format = format + ' ' + gameType;
					}
				} else {
					format = players + ' ' + gameType;
				}
				var shared = false;
				if (isTeamGame) {
					var counts = [];
					_.forEach(armies, function(army) {
						counts.push(army.slots().length);
						if (!army.alliance()) {
							shared = true;
						}
					});
					if (players > 2) {
						format = counts.join('v') + ' ' + (shared ? 'shared' : 'unshared');
					}
				}
			}
		} catch (e) {
			console.error(JSON.stringify(e));
		}
		return format;
	}).extend({
		rateLimit: 1000
	});
	model.lobbyStatus = ko.computed(function() {
		var status = '';
		try {
			var format = model.lobbyFormat();
			if (!format) {
				return '';
			}
			var isGameCreator = model.isGameCreator();
			var requiredContent = model.requiredContent();
			var players = model.playerCount();
			var emptySlots = model.numberOfEmptySlots();

			var items = [];

			items.push(isGameCreator ? 'Hosting' : 'Joined');
			//Legion and Equilibrium
			_.includes(_.map(model.serverMods(),function(r){
				return _.includes(r.identifier.toLowerCase(),'com.pa.n30n.equilibrium');
			}),true) && items.push('Equilibrium');
			
			_.includes(_.map(model.serverMods(),function(r){
				return _.includes(r.identifier.toLowerCase(),'com.pa.legion-expansion-server');
			}),true)&& items.push('Legion');
			
			items.push(format);

			if (emptySlots == 0) {
				items.push('(full)');
			} else if (players > 2 && emptySlots > 0) {
				items.push('(' + emptySlots + ' more)');
			}

			var status = items.join(' ');

			model.sendLobbyStatus(status);

		} catch (e) {
			console.error(JSON.stringify(e));
		}

		return status;

	}).extend({
		rateLimit: 1000
	});
	model.lobbyStatus.subscribe(function(r){
		api.Panel.message('uberbar','superStatsPresence',{scene:'new_game',text:r});
	})
}()
