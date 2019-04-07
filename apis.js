const Validator = require('jsonschema').Validator;
const request = require('request');
const rPush = function (a, b) {
	a.push(b);
	return a;
};
module.exports = function (self) {
	var matchFilters = {
		$project: {
			"_id": 0,
			"armies": {
				"$map": {
					"input": "$armies",
					"as": "x",
					"in": {
						ai: "$$x.ai",
						armyId: "$$x.armyId",
						econ_rate: "$$x.econ_rate",
						extendedPlayers: "$$x.extendedPlayers",
						teamId: "$$x.teamId",
						aiDiff:{$ifNull:["$$x.aiDiff",false]}
					}
				}
			},
			gameEndTime: 1,
			gameStartTime: 1,
			isCustomServer: 1,
			serverMods: 1,
			participatingIds: 1,
			casts: 1,
			isTitans: 1,
			isRanked: 1,
			lobbyId: 1,
			tournamentInfo: 1,
			systemInfo: 1,
			winner: 1
		}
	};
	self.app.get('/api/matches/mostrecent', function (req, res) {
		var max = req.query.max ? parseInt(req.query.max) : 50;
		var min = req.query.min ? parseInt(req.query.min) : 0;
		if (!((max > 0) && (max <= 400))) {
			res.json({
				error: "malformed-query"
			});
			return;
		}
		if (!(min >= 0)) {
			res.json({
				error: "malformed-query"
			});
			return;
		}
		self.database.collection('matches').aggregate(rPush([
			{
				$sort: {
					gameStartTime: -1
				}
			},
			{$skip: min},
			{$limit: max}
		], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
			res.json(q);
		});
	});
	self.app.get('/api/matches/time', function (req, res) {
		var max = req.query.max ? parseInt(req.query.max) : Date.now();
		var min = parseInt(req.query.min);
		if (!(req.query.min && (max > 0) && (min > 0))) {
			res.json({
				error: "malformed-query"
			});
			return;
		}
		var query = {
			"$gte": min,
		};
		if (req.query.max) {
			query["$lt"] = max;
		}
		self.database.collection('matches').aggregate(rPush([
			{$match: {gameStartTime:query}},
			{
				$sort: {
					gameStartTime: -1
				}
			}], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
			res.json(q);
		});
	});
	self.app.get('/api/matches/endtime', function (req, res) {
		var max = req.query.max ? parseInt(req.query.max) : Date.now();
		var min = parseInt(req.query.min);
		if (!(req.query.min && (max > 0) && (min > 0))) {
			res.json({
				error: "malformed-query"
			});
			return;
		}
		var query = {
			"$gte": min,
		};
		if (req.query.max) {
			query["$lt"] = max;
		}
		self.database.collection('matches').aggregate(rPush([
			{$match: {gameEndTime:query}},
			{
				$sort: {
					gameEndTime: -1
				}
			}], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
			res.json(q);
		});
	});
	self.app.post('/api/matches/advancedsearch', function (req, res) {
		var v = new Validator();
		var schema = {
			type: "object",
			properties: {
				systemName: {
					type: 'string',
					maxLength: 100
				},
				participatingIds: {
					type: "array",
					items: {
						type: "string",
						minLength: 1,
						maxLength: 25
					}
				},
				serverMods: {
					type: "array",
					items: {
						type: "string",
						maxLength: 100
					}
				},
				tournament: {
					type: "string",
					maxLength: 30
				},
				casted: {
					type: "boolean"
				},
				min: {
					type: 'integer'
				},
				max: {
					type: 'integer'
				},
				isTournament: {
					type: 'boolean'
				}
			}
		};
		var invalid = v.validate(req.body, schema).errors.length;
		if (invalid) {
			res.json({error: 'malformed-query'});
			return;
		}
		var query = {};
		if (req.body.casted) {
			query['casts.0'] = {$exists: true};
		}
		if (req.body.systemName) {
			query['systemInfo.name'] = req.body.systemName;
		}
		if (req.body.participatingIds) {
			query['participatingIds'] = {$all: req.body.participatingIds};
		}
		if (req.body.serverMods) {
			query['serverMods.identifier'] = {$all: req.body.serverMods};
		}
		if (req.body.tournament) {
			query['tournamentInfo.identifier'] = req.body.tournament;
		}
		if (req.body.isTournament) {
			query['tournamentInfo.isTournament'] = true;
		}
		var min = req.body.min ? req.body.min : 0;
		var max = req.body.max ? req.body.max : 100;
		self.database.collection('matches').aggregate(rPush([
			{
				$sort: {
					gameStartTime: -1
				}
			},
			{$match: query},
			{$skip: min},
			{$limit: max}
		], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
			res.json(q);
		})
	});
	self.app.get('/api/match/:match', function (req, res) {
		var match = req.params.match;
		if (!(match && (match.constructor.name === "String") && (match.length < 50) && (match.length > 5))) {
			res.json({
				error: "not-a-real-lobby-id"
			});
			return;
		}
		self.database.collection('matches').findOne({
			lobbyId: match
		}).then(function (r) {
			if (!r) {
				res.json({
					error: "not-a-real-lobby-id"
				});
				return;
			}
			delete r._id;
			res.json(r);
		})

	});
	self.app.get('/api/player/list', function (req, res) {
		self.database.collection('players').find().toArray().then(function (r) {
			for (var x of r) {
				x.displayName = x.knownDisplayNames[x.knownDisplayNames.length - 1].name;
				delete x.knownDisplayNames;
				delete x._id;
			}
			res.json(r);
		});
	});
	self.app.get('/api/player/:player', function (req, res) {
		var player = req.params.player;
		if (!(player && (player.constructor.name === "String"))) {
			res.json({
				error: "malformed-query"
			});
			return;
		}
		player = player.substr(0, 21);
		self.database.collection('players').findOne({
			uberId: player
		}).then(function (r) {
			if (r) {
				delete r._id;
				self.database.collection('matches').aggregate(rPush([{
					$match: {
						participatingIds: player
					}
				}, {$sort: {gameStartTime: -1}},{$limit:60}], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
					r.matches = q ? q : [];
					res.json(r);
				});
			} else {
				res.json({
					error: "no-player-found"
				});
			}
		});
	});
	self.app.get('/api/tournaments/list', function (req, res) {
		self.database.collection('tournaments').find().sort({date: -1}).toArray().then(function (r) {
			var promises = [];
			for (var x of r) {
				delete x._id;
				(function (X) {
					promises.push(new Promise(function (res, rej) {
						self.database.collection('matches').aggregate(rPush([{$match: {'tournamentInfo.identifier': x.identifier}}, {$sort: {gameStartTime: -1}}], matchFilters), {allowDiskUse: true}).toArray().then(function (q) {
							X.matches = q;
							res()
						})
					}));
				})(x)
			}
			Promise.all(promises).then(function () {
				res.json(r);
			})
		})
	});
};
