ko.bindingHandlers.visibility = {
	update: function (el, va) {
		var q = ko.unwrap(va());
		el.style.visibility = q ? 'visible' : 'hidden'
	}
};
var model = new (function () {
	var self = this;
	//The search criteria will not actually change from the model input. Instead, clicking apply will redirect to the same page with GET parameters so the link can be shared.
	self.perPage = ko.observable(100);
	self.data = ko.observable(false);
	self.searchData = ko.observable(false);
	self.searchCriteria = new (function () {
		var that = this;
		var info = {};
		try {
			info = JSON.parse(qs.search);
		} catch (e) {
		}
		that.findPlayersById = function (ids) {
			var out = [];
			if (!self.searchData()) {
				return out;
			}
			for (var x of self.searchData()) {
				if (ids.includes(x.uberId)) {
					out.push(x.displayName);
				}
			}
			return out;
		};
		that.findPlayersByName = function (n) {
			var out = [];
			if (!self.searchData()) {
				return out;
			}
			for (var x of self.searchData()) {
				if (n.includes(x.displayName)) {
					out.push(x.uberId);
				}
			}
			return out;
		};
		that.displayNames = ko.computed(function () {
			if (!self.searchData()) {
				return false;
			}
			return self.searchData().map(r => {
				return r.displayName
			})
		});
		that.visibleDisplayNames = ko.computed(function () {
			if (!self.searchData()) {
				return false;
			}
			var n = [];
			for (var x of that.displayNames()) {
				if (!that.participatingNames().includes(x)) {
					n.push(x)
				}
			}
			return n;
		});
		that.participatingNames = ko.observableArray();
		that.participatingIds = ko.computed({
			read: function () {
				return that.findPlayersByName(that.participatingNames());
			},
			write: function (q) {
				that.participatingNames(that.findPlayersById(q));
			}
		});
		that.participatingIds(info.participatingIds || []);
		that.systemName = ko.observable(info.systemName || '');
		that.equilibrium = ko.observable(info.serverMods ? info.serverMods.includes('com.pa.n30n.equilibrium') : false);
		that.legion = ko.observable(info.serverMods ? info.serverMods.includes('com.pa.legion-expansion-server') : false);
		that.otherServerMods = ko.observableArray();
		that.serverMods = ko.computed({
			read: function () {
				var z = _.cloneDeep(that.otherServerMods());
				that.legion() && z.push('com.pa.legion-expansion-server');
				that.equilibrium() && z.push('com.pa.n30n.equilibrium');
				return z;
			},
			write: function (q) {
				that.equilibrium(q.includes('com.pa.n30n.equilibrium'));
				that.legion(q.includes('com.pa.legion-expansion-server'));
				var n = [];
				for (var x of q) {
					// just in case more mods get added and the that.legion and that.equilibrium turns into that.knownMods or smth like that.
					if (!(['com.pa.n30n.equilibrium', 'com.pa.legion-expansion-server'].includes(x))) {
						n.push(x);
					}
				}
				that.otherServerMods(n);
			}
		});
		that.isTournament = ko.observable(info.isTournament || false);
		that.casted = ko.observable(info.casted || false);
		that.search = function () {
			var url = window.location.origin + window.location.pathname + '?search=';
			var q = {};
			if (that.systemName()) {
				q.systemName = that.systemName()
			}
			if (that.participatingIds().length) {
				q.participatingIds = that.participatingIds();
			}
			if (that.serverMods().length) {
				q.serverMods = that.serverMods();
			}
			if (that.casted()) {
				q.casted = that.casted();
			}
			if (that.isTournament()) {
				q.isTournament = that.isTournament();
			}
			url += encodeURIComponent(JSON.stringify(q));
			window.location.href = url;
		};
		that.currentPlayer = ko.observable('');
		that.addPlayerToList = function () {
			if (!that.currentPlayer().split(' ').join('').length) {
				return;
			}
			if (!that.visibleDisplayNames().includes(that.currentPlayer())) {
				return;
			}
			that.participatingNames.push(that.currentPlayer());
			that.currentPlayer('')
		};
		that.removePlayerFromList = function () {
			var user = this;
			that.participatingNames.splice(that.participatingNames().indexOf(user), 1)
		};
		that.currentOtherMod = ko.observable('');
		that.addServerModToList = function () {
			if (!that.currentOtherMod().split(' ').join('').length) {
				return;
			}
			if (that.serverMods().includes(that.currentOtherMod())) {
				return;
			}
			that.otherServerMods.push(that.currentOtherMod());
			that.currentOtherMod('');
		};
		that.removeServerModFromList = function () {
			var mod = this;
			that.otherServerMods.splice(that.otherServerMods().indexOf(mod), 1)
		};
		that.getSearchData = function () {

			return $.getJSON('./api/player/list').then(function (r) {
				self.searchData(r);
				that.participatingIds(info.participatingIds || []);
			});
			/*
			return $.getJSON('./testPlayerList.json').then(function(r){
				self.searchData(r);
				that.participatingIds(info.participatingIds || []);
			});
			*/
		};
	});
	self.getData = function (skip) {
		var info = false;
		try {
			info = JSON.parse(qs.search);
		} catch (e) {
		}
		if (!info) {
			return;
		}
		var postItem = {
			min: skip,
			max: self.perPage()
		};
		$.extend(postItem, info);
		$.ajax({
			method: 'POST',
			url: './api/matches/advancedsearch',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(postItem)
		}).then(function (r) {
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
	self.searchCriteria.getSearchData();
	self.getData(0);
})();
$(document).ready(function () {
	ko.applyBindings(model);
});