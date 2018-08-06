const Game = require('./game.js');
const Validator = require('jsonschema').Validator;

module.exports = function (self) {
	self.validateGameStartPacket = function (p) {
		//This validation is not very rigorous pls no abuse :(
		var v = new Validator();
		var topSchema = {
			id: "topSchema",
			type: "object",
			required: ["uberId", "displayName", "armyId", "teamId", "armies", "isCustomServer", "lobbyId", "isRanked", "serverMods"],
			properties: {
				uberId: {
					type: "string",
					minLength: 16,
					maxLength: 22
				},
				displayName: {
					type: "string",
					minLength: 1,
					maxLength: 32
				},
				isTitans: {type: "boolean"},
				armyId: {type: "integer"},
				teamId: {type: "integer"},
				isCustomServer: {type: "boolean"},
				lobbyId: {type: "string", maxLength: 50},
				isRanked: {type: "boolean"},
				serverMods: {"$ref": "/serverModSchema"},
				armies: {"$ref": "/armySchema"}
			}
		};
		var serverModSchema = {
			id: "/serverModSchema",
			type: "array",
			items: {
				type: "object",
				"additionalProperties": false,
				required: ["identifier", "display_name", "version"],
				properties: {
					identifier: {
						type: "string",
						maxLength: 60
					},
					display_name: {
						type: "string",
						maxLength: 60
					},
					version: {
						type: "string",
						maxLength: 30
					}
				}
			}
		};
		var armySchema = {
			id: "/armySchema",
			type: "array",
			items: {
				type: "object",
				required: ["primaryColor", "secondaryColor", "slots", "ai", "econ_rate", "armyId", "teamId"],
				"additionalProperties": false,
				properties: {
					primaryColor: {
						type: "string",
						maxLength: 7,
						minLength: 7,
						format: "color"
					},
					secondaryColor: {
						type: "string",
						maxLength: 7,
						minLength: 7,
						format: "color"
					},
					slots: {
						type: "array",
						items: {type: "string", maxLength: 50}
					},
					ai: {type: "boolean"},
					econ_rate: {type: "number"},
					armyId: {type: "integer"},
					teamId: {type: "integer"}
				}
			}
		};
		v.addSchema(armySchema, '/armySchema');
		v.addSchema(serverModSchema, '/serverModSchema');
		return v.validate(p, topSchema);
	};
	self.sendToApis = function (ev, msg) {
		for (var x of self.apis) {
			x.emit(ev, msg)
		}
	};
	self.wServer.on('connect', function (s) {
		var IP = s.request.headers['x-forwarded-for'] || s.request.connection.remoteAddress;
		if (self.bannedIPs.includes(IP)) {
			s.disconnect(true);
			return;
		}

		s.evict = setTimeout(function () {
			s.disconnect(true);
		}, 60 * 1000);
		s.on('identify', function (r) {
			if (!(r.constructor.name === "Object")) {
				return;
			}
			if (r.type === 'player') {
				s.emit('identify', true);
				s.StatsType = 'player';
				s.on('gameStart', function (r) {
					if (self.bannedIds.includes(r.uberId)) {
						s.disconnect(true);
						return;
					}
					var valid = self.validateGameStartPacket(r);
					if (valid.errors.length) {
						console.log(valid.errors);
						return;
					}
					r.lobbyId = r.lobbyId.toLowerCase();
					for (var x of self.activeGames) {
						if (x.lobbyId === r.lobbyId) {
							x.addPlayer(s, r);
							return true;
						}
					}
					self.database.collection('matches').findOne({
						lobbyId: r.lobbyId
					}).then(function (o) {
						if (o) {
							s.emit('game-ended');
							return;
						}
						//Check twice to avoid race condition if someone connects during a query
						//This is more efficient than doing a database query for every connection and having just this block rather than the one above
						for (var d of self.activeGames) {
							if (d.lobbyId === r.lobbyId) {
								d.addPlayer(s, r);
								return true;
							}
						}
						var ng = new Game(r, self.converter);
						ng.onResolve(function () {
							self.sendToApis('gameStart', ng.compileStartInfo().game);
						});
						ng.onGameEnd(function (info) {
							self.activeGames.splice(self.activeGames.indexOf(ng), 1);
							if (ng.nodb) {
								return;
							}
							self.sendToApis('gameOver', info);
							self.database.collection('matches').insertOne(info.game);
						});
						//handle player profiles
						ng.onGameEnd(function (q) {
							if (ng.nodb) {
								return;
							}
							var info = q.game;
							var playerMap = q.displayNameMap;
							for (var l of info.participatingIds) {
								(function (x) {
									self.database.collection('players').findOne({
										uberId: x
									}).then(function (r) {
										var profile = r;
										if (!r) {
											profile = {
												uberId: x,
												knownDisplayNames: []
											};
										}
										var name = '';
										var currentName = profile.knownDisplayNames[profile.knownDisplayNames.length - 1] ? profile.knownDisplayNames[profile.knownDisplayNames.length - 1].name : false;
										if (x === "-2") {
											name = 'AI';
										} else {
											var k = Object.keys(playerMap);
											for (var y of k) {
												if (playerMap[y].uberId === x) {
													name = y;
												}
											}
										}
										if ((name !== currentName) && name) {
											profile.knownDisplayNames.push({
												name: name,
												time: Date.now()
											});
										}
										return self.database.collection('players').updateOne({
											uberId: x
										}, profile, {
											upsert: true
										});
									})
								})(l);
							}
						});
						self.activeGames.push(ng);
						ng.addPlayer(s, r);
					});
				});
				clearTimeout(s.evict);
			} else if (r.type === 'api' || r.type === 'app' || r.type === 'webservice') {
				s.StatsType = 'api';
				self.apis.push(s);
				s.on('disconnect', function (r) {
					var k = self.apis.indexOf(s);
					(k + 1) && self.apis.splice(k, 1);
				});
				clearTimeout(s.evict);

			} else {
				s.emit('identify', {
					success: false,
					error: 'Not player/api'
				});
			}
		});
	});
};
