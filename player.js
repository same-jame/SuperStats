ko.bindingHandlers.setPageTitle = {
	update: function (el, va, ab, vm, binding) {
		var k = ko.unwrap(va());
		document.querySelector('title').innerHTML = k;
	}
};
var model = new (function () {
	var self = this;
	self.getData = function (q) {
		return $.getJSON('./testPlayer.json')
		//return $.getJSON('./api/player/' + q);
	};
	self.data = ko.observable(false);
	self.currentDisplayName = ko.computed(function () {
		if (!self.data()) {
			return false;
		}
		return self.data().knownDisplayNames.sort(function (a, b) {
			return b.time - a.time;
		})[0].name;
	});
	self.knownDisplayNames = ko.computed(function () {
		if (!self.data()) {
			return [];
		}
		var n = [];
		for (var x of self.data().knownDisplayNames) {
			n.push({name: x.name, time: x.time, timeString: moment(x.time).format('DD/MM/YYYY HH:mm:ss')});
		}
		return ko.mapping.fromJS(n)();
	});
	self.matches = ko.computed(function () {
		if (!self.data()) {
			return;
		}
		var n = _.cloneDeep(self.data().matches);
		for (var x of n) {
			x.titleString = (function (x) {
				//copypasta from match.js
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
					return r.identifier.includes('com.pa.n30n.equilibrium')
				}).includes(true);
				that.legion = match.serverMods.map(r => {
					return r.identifier.includes('com.pa.legion-expansion-server')
				}).includes(true);
			})(x);
			x.startTimeString = moment(x.gameStartTime).format('DD/MM/YYYY HH:mm:ss');
			x.durationString = x.gameEndTime ? moment(x.gameEndTime - x.gameStartTime).format('mm:ss') : 'Unknown';
			x.systemName = x.systemInfo.name;
		}
		return ko.mapping.fromJS(n)();
	});
	self.redirectToMatchPage = function () {
		var that = this;
		window.open('./match.html?match=' + that.lobbyId());
	};
	self.showKnownNames = ko.observable(false);
	self.toggleShowKnownNames = function () {
		self.showKnownNames(!self.showKnownNames());
	};
	self.show404 = ko.observable(false);
	self.getData(qs.match).then(function (q) {
		if (!q || q.error) {
			self.show404(true);
			return;
		}
		self.data(q);
	});
})();
$(document).ready(function () {
	ko.applyBindings(model);
});