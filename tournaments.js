var model = new (function () {
	var self = this;
	self.showTournamentMakeButton = localStorage.getItem('apiKey') ?
		JSON.parse(localStorage.getItem('permissions')).includes('tournament') || JSON.parse(localStorage.getItem('permissions')).includes('root') : false;
	self.data = ko.observable([]);
	self.processedData = ko.computed(function () {
		var m = self.data().map(function (A) {
			var C = _.cloneDeep(A);
			for (var x of C.matches) {
				//copypasta from player.js
				x.titleString = (function (x) {
					var out = '';
					var teams = {};
					for (var y of x) {
						if (!teams[y.teamId.toString()]) {
							teams[y.teamId.toString()] = [];
						}
						for (var z of y.extendedPlayers) {
							teams[y.teamId.toString()].push(z.displayName);
						}
					}
					for (var y of Object.keys(teams)) {
						var t = teams[y];
						if (out) {
							out += 'vs ';
						}
						out += t.join(', ');
						out += ' ';
					}
					return out.substring(0, out.length - 1);
				})(x.armies);
				x.winnerString = (function (match) {
					for (var x of match.armies) {
						if (x.teamId === match.winner) {
							var dnames = [];
							for (var y of x.extendedPlayers) {
								dnames.push(y.displayName);
							}
							return dnames.join(', ');
						}
					}
					return 'unkown';
				})(x);
				x.info = new (function (match) {
					var that = this;
					that.isTitans = match.isTitans;
					that.isRanked = match.isRanked;
					that.isCustomServer = match.isCustomServer;
					that.equilibrium = match.serverMods.map(r => {
						return r.identifier.includes('com.pa.n30n.equilibrium');
					}).includes(true);
					that.legion = match.serverMods.map(r => {
						return r.identifier.includes('com.pa.legion-expansion-server');
					}).includes(true);
				})(x);
				x.startTimeString = moment(x.gameStartTime).format('DD/MM/YYYY HH:mm:ss');
				x.durationString = x.gameEndTime ? moment(x.gameEndTime - x.gameStartTime).format('mm:ss') : 'Unknown';
				x.systemName = x.systemInfo.name;
				x.link = './match.html?match=' + x.lobbyId;
			}
			C.timeString = moment(C.date).format('DD/MM/YYYY HH:mm:ss');
			var toModify = {
				identifier: C.identifier,
				name: C.name,
				live: C.live,
				date: C.date
			};
			if (C.cast) {
				toModify.cast = C.cast;
			}
			if (C.link) {
				toModify.link = C.link;
			}
			C.addLink = './tournament_make.html?info=' + encodeURIComponent(JSON.stringify(toModify));
			C.link = C.link || '';
			C.cast = C.cast || '';
			return C;
		});
		return ko.mapping.fromJS(m)();
	});
	$.getJSON('./api/tournaments/list').then(self.data);
})();
$(document).ready(function () {
	ko.applyBindings(model);
});