var _ = require('lodash');
var Validator = require('jsonschema').Validator;
module.exports = function (r, converter) {
	var self = this;
	self.endTimeout = setTimeout(function () {
		self.endGame();
	}, 5 * 60 * 60 * 1000);
	self.serverMods = r.serverMods;
	self.armies = r.armies || [];
	for (var x of self.armies) {
		x.dataPointsUnit = {};
		x.dataPointsStats = {};
		x.death = false;
		if (x.ai) {
			for (var y in x.slots) {
				x.slots[y] = 'AI ' + x.slots[y];
			}
		}
	}
	self.socks = [];
	self.extendedPlayerMap = {};
	self.systemInfo = r.systemInfo || false;
	self.winner = false;
	self.additionalGameInfo = r.additionalGameInfo;
	self.isCustomServer = !!r.isCustomServer;
	self.isRanked = r.isRanked;
	self.isTitans = !!r.isTitans;
	self.lobbyId = r.lobbyId;
	self.deadArmies = [];
	self.deadTeams = [];
	self.gameStartTime = Date.now();
	self.gameEndTime = false;
	self.dcTimeout = false;
	self.resolveHandlers = [];
	self.buildVersion = r.buildNumber || self.PABuildVersion;
	self.onResolve = function (r) {
		self.resolveHandlers.push(r)
	};
	self.checkForNewDeaths = function (data) {
		var tests = [];
		for (var x of data) {
			if (x.defeated) {
				if (!self.deadArmies.includes(x.id)) {
					self.deadArmies.push(x.id);
					x.defeated = true;
					self.getArmyById(x.id).death = Date.now() - self.gameStartTime;
					tests.includes(x.teamId) || tests.push(x.teamId);
				}
			}
		}
		for (var x of tests) {
			var p = true;
			for (var y of data) {
				if (y.teamId === x) {
					if (!y.defeated) {
						p = false;
					}
				}
			}
			if (p) {
				self.deadTeams.push(x);
				self.checkForVictory();
			}
		}

	};
	self.checkForVictory = function () {
		var t = self.getTeamIds();
		if (self.deadTeams.length === (t.length - 1)) {
			for (var x of t) {
				if (!self.deadTeams.includes(x)) {
					self.winner = x;
					self.gameEndTime = Date.now();
					self.endGame();
					return;
				}
			}
		} else if (self.deadTeams.length === t.length) {
			self.winner = -1;
			self.gameEndTime = Date.now();
			self.endGame();
		}
	};
	self.getTeamIds = function () {
		var distinct = [];
		for (var x of self.armies) {
			if (!distinct.includes(x.teamId)) {
				distinct.push(x.teamId)
			}
		}
		return distinct;
	};
	self.getArmyById = function (id) {
		for (var x of self.armies) {
			if (x.armyId === id) {
				return x;
			}
		}
	};
	self.getArmiesByTeamId = function (id) {
		var out = [];
		for (var x of self.armies) {
			if (x.teamId === id) {
				out.push(x)
			}
		}
		return out;
	};
	self.generatePlayerMap = function (armylist) {
		for (var x of armylist) {
			if (!x.ai) {
				for (var y of x.slots) {
					self.extendedPlayerMap[y] = self.extendedPlayerMap[y] || {
						uberId: false,
						fromPlayer: false
					};
				}
			}
		}
		var plist = [];
		for (var x of armylist) {
			if (!x.ai) {
				for (var y of x.slots) {
					if (!self.extendedPlayerMap[y].fromPlayer) {
						plist.push(y);
					}

				}
			} else {
				for (var y of x.slots) {
					self.extendedPlayerMap[y] = {
						uberId: '-2',
						fromPlayer: true
					}
				}
			}
		}
		for (var x of plist) {
			(function (r) {
				converter.convertUser(r, 'TitleDisplayName').then(function (p) {
					self.extendedPlayerMap[r].uberId = p || '-1';
					var done = true;
					for (var q of Object.keys(self.extendedPlayerMap)) {
						if (!self.extendedPlayerMap[q].uberId) {
							done = false;
						}
					}
					if (done) {
						for (var d of self.resolveHandlers) {
							d();
						}
					}
				})
			})(x)
		}
	};
	self.generatePlayerMap(self.armies);
	self.updatePlayer = function (r) {
		self.extendedPlayerMap[r.displayName] = self.extendedPlayerMap[r.displayName] || {
			uberId: false,
			fromPlayer: false
		};
		self.extendedPlayerMap[r.displayName].uberId = r.uberId;
		self.extendedPlayerMap[r.displayName].fromPlayer = true;
	};
	self.addSock = function (socket, handshake) {
		clearTimeout(self.dcTimeout);
		self.dcTimeout = false;
		self.socks.push(socket);
		socket.shake = handshake;
		var theArmy = self.getArmyById(socket.shake.armyId);
		theArmy.dataPointsStats[socket.shake.uberId] = [];
		theArmy.dataPointsUnit[socket.shake.uberId] = [];
		socket.emit('in-game', true);
		socket.on('dataPoint', function (point) {
			var a = self.getArmyById(socket.shake.armyId);
			var v = new Validator();
			var schema = {
				"id": "/DataPoint",
				"type": "object",
				"required": ["metalProd", "metalLoss", "metalStorage", "metalStored", "energyProd", "energyLoss", "energyStorage", "energyStored", "simSpeed", "time", "realTime"],
				"properties": {
					"metalProd": {type: "integer"},
					"metalLoss": {type: "integer"},
					"metalStorage": {type: "integer"},
					"metalStored": {type: "integer"},
					"energyProd": {type: "integer"},
					"energyLoss": {type: "integer"},
					"energyStorage": {type: "integer"},
					"energyStored": {type: "integer"},
					"simSpeed": {type: "integer"},
					"time": {type: "integer"},
					"realTime": {type: "integer"}
				}
			};
			if (v.validate(point, schema).errors.length) {
				return;
			}
			point.realTime -= self.gameStartTime;
			a.dataPointsStats[socket.shake.uberId].push(point)
		});
		socket.on('unitDataPoint', function (point) {
			var a = self.getArmyById(socket.shake.armyId);
			var v = new Validator();
			var schema = {
				"id": "/UnitData",
				"type": "array",
				"items": {
					"type": "object",
					//the required flag didn't work here from testing. 
					//Switched to this version and it worked but it is inconsistent with other pieces of validation code.
					"properties": {
						"delta": {type: "integer",required:true},
						"unit":{type:"string",maxLength:180,required:true},
						"realTime":{type:"integer",required:true},
						"time":{type:"integer",required:true}
					}
				}
			};
			var invalid = v.validate(point, schema).errors.length;
			if (invalid) {
				return;
			}
			for (var y of point) {
				y.realTime -= self.gameStartTime;
				a.dataPointsUnit[socket.shake.uberId].push(y)
			}

		});
		socket.on('died', function () {
			socket.disconnect();

		});
		socket.on('disconnect', function () {
			self.socks.splice(self.socks.indexOf(socket), 1);
			if (!self.socks.length) {
				self.dcTimeout = setTimeout(function () {
					self.endGame();
				}, 3 * 60 * 60);
			}

		});
		socket.on('death', function (info) {
			self.checkForNewDeaths(info);
			socket.emit('deaths-validated');
		})
	};
	self.addPlayer = function (sock, hshake) {
		self.addSock(sock, hshake);
		self.updatePlayer(hshake);
	};
	self.compileJsonInfo = function () {
		var a = _.cloneDeep(self.armies);
		var participatingIds = [];
		for (var x of a) {
			x.extendedPlayers = [];
			if (x.ai) {
				for (var y of x.slots) {
					x.extendedPlayers.push({
						displayName: 'AI: ' + y,
						uberId: '-2'
					});
					if (!participatingIds.includes('-2')) {
						participatingIds.push('-2');
					}

					delete x.slots;
				}

			} else {
				for (var y of x.slots) {
					x.extendedPlayers.push({
						displayName: y,
						uberId: self.extendedPlayerMap[y].uberId
					});
					if (!participatingIds.includes(self.extendedPlayerMap[y].uberId)) {
						participatingIds.push(self.extendedPlayerMap[y].uberId);
					}
				}
				delete x.slots;
			}
			//we need to truncate this and put it into the original data form
			var people_st = Object.keys(x.dataPointsStats);
			var StatsMax = -1;
			var StatsMaxPerson = [];
			for (var e of people_st) {
				var p = x.dataPointsStats[e];
				if (p.length > StatsMax) {
					StatsMax = p.length;
					StatsMaxPerson = p;
				}
			}
			var dataOut = _.cloneDeep(StatsMaxPerson);
			for (var j of dataOut) {
				delete j.apm;
			}
			var apmData = {};
			delete x.dataPointsStats[StatsMaxPerson];
			for (var e of people_st) {
				var p = x.dataPointsStats[e];
				apmData[e] = [];
				for (var d of p) {
					apmData[e].push({
						realTime: d.realTime,
						time: d.time,
						apm: d.apm
					});
				}
			}
			x.dataPointsApm = apmData;
			x.dataPointsStats = dataOut;
			var people_un = Object.keys(x.dataPointsUnit);
			var UnitsMax = -1;
			var UnitMaxPerson = [];
			for (var e of people_un) {
				var p = x.dataPointsUnit[e];
				if (p.length > UnitsMax) {
					UnitsMax = p.length;
					UnitMaxPerson = p;
				}
			}
			x.dataPointsUnit = UnitMaxPerson;
		}
		return {
			game: {
				armies: a,
				winner: self.winner,
				isRanked: self.isRanked,
				isCustomServer: self.isCustomServer,
				lobbyId: self.lobbyId,
				isTitans: self.isTitans,
				serverMods: self.serverMods,
				additionalGameInfo: self.additionalGameInfo,
				participatingIds: participatingIds,
				gameEndTime: self.gameEndTime,
				gameStartTime: self.gameStartTime,
				tournamentInfo: {
					isTournament: false
				},
				casts: [],
				systemInfo: self.systemInfo,
				buildVersion: self.buildVersion
			},
			displayNameMap: self.extendedPlayerMap
		}
	};
	self.compileStartInfo = function () {
		var a = _.cloneDeep(self.armies);
		var participatingIds = [];
		for (var x of a) {
			delete x.dataPointsStats;
			delete x.dataPointsUnit;
			delete x.death;
			x.extendedPlayers = [];
			if (x.ai) {
				for (var y of x.slots) {
					x.extendedPlayers.push({
						displayName: 'AI: ' + y,
						uberId: '-2'
					});
					if (!participatingIds.includes('-2')) {
						participatingIds.push('-2');
					}

					delete x.slots;
				}

			} else {
				for (var y of x.slots) {
					x.extendedPlayers.push({
						displayName: y,
						uberId: self.extendedPlayerMap[y].uberId
					});
					if (!participatingIds.includes(self.extendedPlayerMap[y].uberId)) {
						participatingIds.push(self.extendedPlayerMap[y].uberId);
					}

				}
				delete x.slots;
			}

		}
		return {
			game: {
				armies: a,
				isRanked: self.isRanked,
				isCustomServer: self.isCustomServer,
				lobbyId: self.lobbyId,
				isTitans: self.isTitans,
				serverMods: self.serverMods,
				additionalGameInfo: self.additionalGameInfo,
				participatingIds: participatingIds,
				gameStartTime: self.gameStartTime,
				systemInfo: self.systemInfo,
				buildVersion: self.buildVersion
			},
			displayNameMap: self.extendedPlayerMap
		}
	};
	self.gameEndHandlers = [];
	self.onGameEnd = function (a) {
		self.gameEndHandlers.push(a);
	};
	self.gameEnding = false;
	self.endGame = function () {
		if (self.gameEnding) {
			return;
		}
		self.gameEnding = true;
		for (var x of self.socks) {
			x.disconnect();
		}
		var info = self.compileJsonInfo();
		for (var x of self.gameEndHandlers) {
			x(info);
		}
	};

};
