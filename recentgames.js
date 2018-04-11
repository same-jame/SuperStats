ko.bindingHandlers.visibility = {
	update: function (el, va) {
		var q = ko.unwrap(va());
		el.style.visibility = q ? 'visible' : 'hidden'
	}
};
var model = new (function () {
	var self = this;
	self.perPage = ko.observable(14);
	self.data = ko.observable(false);
	self.getData = function (skip) {
		return $.getJSON('./api/matches/mostrecent?' + $.param({min: skip, max: self.perPage()})).done(function (r) {
			self.data(r);
		});
	};
	self.matches = ko.computed(function () {
		if (!self.data()) {
			return;
		}
		var n = _.cloneDeep(self.data());
		for (var x of n) {
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
				var out = '';
				for (var x of match.armies) {
					if (x.teamId === match.winner) {
						for (var y of x.extendedPlayers) {
							out += y.displayName + ', ';
						}
					}
				}
				return out.length ? out.substring(0, out.length - 2) : 'unknown';
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
		return ko.mapping.fromJS(n)();
	});
	self.matchLength = ko.computed(function () {
		return self.matches() ? self.matches().length : 0;
	});
	self.page = ko.observable(1);
	self.incrementPage = function (s) {
		self.page(self.page() + s);
	};
	self.skip = ko.computed(function () {
		return (self.page() - 1) * self.perPage();
	});
	self.skip.subscribe(self.getData);
	self.getData(0);
})();
$(document).ready(function () {
	ko.applyBindings(model);
});