//really spicy hack here
window.__define = window.define;
window.define = undefined;
loadScript("coui://ui/mods/com.flubbateios.stats/socket.js");
loadScript("coui://ui/mods/com.flubbateios.stats/hashes.js");
window.define = window.__define;
window.superStats = new (function () {
	function rgbToHex(r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	$.fn.bindFirst = function (name, fn) {
		this.on(name, fn);
		this.each(function () {
			var handlers = $._data(this, 'events')[name.split('.')[0]];
			var handler = handlers.pop();
			handlers.splice(0, 0, handler);
		});
	};
	var self = this;

	function setupListeners() {
		var listenerTypes = ['watchlist.setCreationAlertTypes', 'watchlist.setDeathAlertTypes'];
		for (var x in listenerTypes) {
			engine.call(listenerTypes[x], '["Mobile", "Structure", "Recon"]', '[]');
		}
	}

	var displayName = decode(sessionStorage.displayName);
	var uberId = decode(sessionStorage.uberId);
	var lobbyId = model.lobbyId();
	model.lobbyId.subscribe(function (r) {
		lobbyId = r;
	});
	self.willReport = true;
	var wsURL = 'https://flubbateios.com';
	//var wsURL = 'http://localhost';
	self.socket = io(wsURL, {
		path: '/stats/api/ws'
	});
	self.socket.emit('identify', {
		type: 'player'
	});
	self.socket.on('game-ended', function () {
		self.stopReporting();
		self.socket.disconnect();
	})
	self.currentStats = {
		metalProd: 0,
		metalLoss: 0,
		metalStorage: 0,
		energyProd: 0,
		energyLoss: 0,
		energyStorage: 0,
		simSpeed: 0,
		time: 0,
		apm: 0,
		realTime: Date.now()
	};
	self.apmCounter = false;
	self.keyPressCount = 0; // do not change
	self.sendFrequency = 15;
	self.apmFrequency = 7.5 * 1000; // this is in ms
	self.addDataPoint = function () {
		self.currentStats.realTime = Date.now();
		self.socket.emit('dataPoint', _.clone(self.currentStats));
	};
	self.currentUnitData = [];
	self.addUnitData = function (r) {
		var found = false;
		for (var x in self.currentUnitData) {
			var c = self.currentUnitData[x];
			if (r.unit === c.unit) {
				c.delta += r.delta;
				found = true;
			}

		}
		if (!found) {
			self.currentUnitData.push(r);
		}
	};
	self.sendUnitData = function () {
		var nar = [];
		for (var x in self.currentUnitData) {
			self.currentUnitData[x].realTime = Date.now();
			self.currentUnitData[x].time = self.currentStats.time;
			if (self.currentUnitData[x].delta !== 0) {
				nar.push(self.currentUnitData[x])
			}

		}
		if (!self.currentUnitData.length) {
			return;
		}
		self.socket.emit('unitDataPoint', _.cloneDeep(nar));
		self.currentUnitData = [];
	}
	self.compileInitialPacket = function () {
		var def = $.Deferred();
		var res = def.resolve;
		var out = {};
		out.uberId = uberId;
		out.displayName = displayName;
		out.isTitans = api.content.usingTitans();
		var armies = [];
		for (var x in model.players()) {
			var army = model.players()[x];
			armies.push({
				primaryColor: rgbToHex.apply(rgbToHex, army.primary_color),
				secondaryColor: rgbToHex.apply(rgbToHex, army.secondary_color),
				slots: army.slots,
				ai: !!army.ai,
				econ_rate: army.econ_rate,
				armyId: army.id,
				teamId: army.alliance_group || army.id
			});
			if (army.stateToPlayer === "self") {
				out.armyId = army.id;
				out.teamId = army.alliance_group || army.id;
			}
		}
		out.armies = armies;
		out.isCustomServer = !(model.serverType() === "uber");
		var hash = new Hashes.SHA256().hex(model.gameHostname() + model.gamePort());
		out.lobbyId = out.isCustomServer ? 'custom_' + lobbyId + '_' + hash.substring(0, 6) : lobbyId;
		out.isRanked = model.gameOptions.isLadder1v1();
		var sysInfo = model.planetListState();
		out.systemInfo = {name: sysInfo.system, planets: []};
		for (var x in sysInfo.planets) {
			var planet = sysInfo.planets[x];
			if (!planet.isSun) {
				out.systemInfo.planets.push({
					name: planet.name,
					radius: planet.radius,
					biome: planet.biome,
					halleys: planet.delta_v_threshold || false,
					starting: planet.starting_planet,
					metalSpots: planet.metalSpots
				})
			}
		}
		api.mods.getMounted('server', true).then(function (r) {
			var or = [];
			for (var x in r) {
				var mod = r[x];
				or.push({
					identifier: mod.identifier.toString().substr(0, 60),
					display_name: mod.display_name.toString().substr(0, 60),
					version: mod.version.toString().substr(0, 30)
				})
			}
			out.serverMods = or;
			engine.asyncCall("ubernet.getCurrentClientVersion").done(function (P) {
				out.buildNumber = P;
				res(out);
			});
		});
		return def;
	};
	self.stopReporting = function () {
		self.reporting = false;

	};
	self.reporting = false;
	var stats = self.currentStats;
	self.seenUnitIds = [];
	var OldWatchList = handlers.watch_list || function () {
	};
	handlers.watch_list = function (pay) {
		var data = pay.list;
		if (!data) {
			return;
		}
		for (var x in data) {
			var item = data[x];
			var delta = 0;
			if (item.watch_type === 0) {
				delta = 1;
				self.seenUnitIds.push(item.id);
			} else if (item.watch_type === 2) {
				if (_.includes(self.seenUnitIds, item.id)) {
					self.seenUnitIds.splice(self.seenUnitIds.indexOf(item.id), 1);
					delta = -1;
				}

			}
			if (delta) {
				self.addUnitData({
					delta: delta,
					unit: item.spec_id
				});
			}

		}
		OldWatchList(pay);

	};
	var OldHandlersArmyState = handlers.army_state;
	self.dead = false;
	self.socket.on('deaths-validated', function () {
		if (self.dead) {
			self.stopReporting();
			self.socket.emit('died');
		}
	});
	handlers.army_state = function (r) {
		if (!self.reporting) {
			OldHandlersArmyState(r);
			return;
		}
		var narr = [];
		for (var x in r) {
			var army = r[x];
			narr.push({
				teamId: army.alliance_group || army.id,
				armyId: army.id,
				id: army.id,
				defeated: army.defeated || false
			});
			if (army.id === self.armyId) {
				if (army.defeated) {
					self.dead = true;
				}
			}
		}
		self.sendUnitData();
		self.socket.emit('death', narr);
		OldHandlersArmyState(r);
	};
	var currentTime = -1;
	var OldTime = handlers.time || function () {
	};
	handlers.time = function (pay) {
		var time = pay.current_time;
		stats.time = Math.floor(time);
		stats.simSpeed = pay.server_rate * 100;
		if (((stats.time % self.sendFrequency) === 0) && (stats.time !== currentTime) && self.reporting) {
			self.addDataPoint();
			self.sendUnitData();
		}
		currentTime = stats.time;
		OldTime(pay);
	};
	var OldArmy = handlers.army || function () {
	};
	handlers.army = function (p) {
		stats.metalProd = p.metal.production + p.metal.shared;
		stats.metalLoss = p.metal.demand;
		stats.metalStorage = p.metal.storage;
		stats.metalStored = p.metal.current;
		stats.energyProd = p.energy.production + p.energy.shared;
		stats.energyLoss = p.energy.demand;
		stats.energyStorage = p.energy.storage;
		stats.energyStored = p.energy.current;
		OldArmy(p);
	};
	handlers.superStatsReporting = function (r) {
		self.willReport = r;
	};
	/*
	model.serverMode.subscribe(function(r){
		if(r === 'playing'){
			self.startReporting();
		}
	});*/
	//serverMode is assigned before all the gameOptions so they will all be false if there is a reconnect so the player won't actually report.
	//We need to figure out whether to start reporting after everything has been assigned.
	var OldServerState = handlers.server_state;
	handlers.server_state = function (r) {
		OldServerState(r);
		if (model.serverMode() === "playing") {
			self.startReporting();
		}
	};
	model.superStatsCanReport = ko.computed(function () {
		var isLocalServer = model.serverType() === 'local';
		return !(model.sandbox() || model.gameOptions.dynamic_alliances() || isLocalServer || model.gameOptions.isGalaticWar() || model.isSpectator());
	});
	model.superStatsCanReport.subscribe(function (r) {
		api.Panel.message("message", 'superStatsCanReport', r);
	});
	model.isSpectator.subscribe(function (q) {
		if (q && self.reporting) {
			self.stopReporting();
			self.socket.disconnect();
		}
	});
	self.startReporting = function () {
		api.Panel.message("message", 'superStatsCheckbox', false);
		
		api.Panel.message('game_over_panel', 'superStatsInfo', {reported: self.willReport && model.superStatsCanReport()});
		if (self.reporting) {
			return;
		}
		if ((!self.willReport) || (!model.superStatsCanReport())) {
			console.log('SuperStats NOT reporting');
			self.socket.disconnect();
			return;
		}
		if (!self.socket.connected) {
			self.socket.disconnect();
			return;

		}
		console.log('SuperStats now reporting');
		self.apmCounter = setInterval(function () {
			self.currentStats.apm = 60 * 1000 * (self.keyPressCount / self.apmFrequency);
			self.keyPressCount = 0;
		}, self.apmFrequency);
		self.startingRealTime = Date.now();
		self.reporting = true;
		self.compileInitialPacket().done(function (r) {
			api.Panel.message('game_over_panel', 'lobbyId', r.lobbyId);
			self.socket.emit('gameStart', r);
		});
		for (var x in model.players()) {
			var army = model.players()[x];
			if (army.stateToPlayer === "self") {
				self.armyId = army.id;
			}
		}
	};
	for (var q = 1; q <= 4; q++) {
		setTimeout(setupListeners, 2000 * q);
	}
	setupListeners();

	self.init = function () {
		api.Panel.message("message", 'superStatsCanReport', model.superStatsCanReport());
		api.Panel.message('game_over_panel', 'lobbyId', lobbyId);
		$(document).bindFirst("keyup", function (e) {
			self.keyPressCount += 1
		});
		$('holodeck').bindFirst("mousedown", function (e) {
			self.keyPressCount += 1
		});
		$(document).bindFirst("mousedown", function (e) {
			self.keyPressCount += 1
		});

	};
})();
$(document).ready(superStats.init)
