const url = require("url");
const Validator = require('jsonschema').Validator;
module.exports = function (self) {
	self.app.use('/api/matches/:game/cast', self.permissionMiddleware('cast'));
	self.app.post('/api/matches/:game/cast', function (req, res) {
		var data = req.body || false;
		if (!(data && data.link.constructor === String && data.user.constructor === String)) {
			res.send({error: 'malformed-query'});
			return;
		}
		var link = data.link.substr(0, 80);
		var user = data.user.substr(0, 35);
		var q = url.parse(link.toLowerCase());
		var valid = false;
		if (q.hostname === "youtube.com" || q.hostname === "gaming.youtube.com" || q.hostname === "www.youtube.com") {
			if (q.pathname === "/watch") {
				valid = true;
			}
		}
		if (q.hostname === "twitch.tv" || q.hostname === "www.twitch.tv") {
			if (q.pathname.startsWith('/videos/')) {
				valid = true;
			}
		}
		if (!valid) {
			res.send({error: 'invalid-link'});
			return;
		}
		var add = {link: link, user: user};
		var match = req.params.game;
		if (!(match && (match.constructor.name === "String") && (match.length < 50) && (match.length > 5))) {
			res.json({
				error: "not-a-real-lobby-id"
			});
			return;
		}
		self.database.collection('matches').update({lobbyId: match}, {$addToSet: {casts: add}}).then(function (r) {
			if (!r.result.n) {
				res.json({error: 'not-real-match'});
				return;
			}
			if (!r.result.nModified) {
				res.json({error: 'already-added'});
				return;
			}
			res.json({success: true, lobbyId: req.params.game})
		});
	});
	self.app.use('/api/tournaments/modify_or_add', self.permissionMiddleware('tournament'));
	self.app.post('/api/tournaments/modify_or_add', function (req, res) {
		var data = req.body;
		delete data.apiKey;
		//validator probably not necessary but if tournament data is expanded then could be useful
		//Identifier will be used for URls so it MUST be alphanumeric
		var v = new Validator();
		var schema = {
			type: "object",
			required: ["identifier", "name", "date"],
			properties: {
				identifier: {
					type: "string",
					format: "alpha-numeric",
					maxLength: 40,
					minLength: 4
				},
				name: {
					type: "string",
					maxLength: 100,
					minLength: 6
				},
				date: {
					type: "integer"
				},
				link: {
					type: "string",
					maxLength: 150
				},
				cast: {
					type: "string",
					maxLength: 150
				},
				live: {
					type: "boolean"
				}
			}
		};
		var valid = v.validate(data, schema);
		if (valid.errors.length) {
			res.json({
				error: 'malformed-query'
			});
			return;
		}
		self.database.collection('tournaments').updateOne({identifier: data.identifier}, data, {upsert: true}).then(function () {
			res.json({success: true})
		});
	});
	self.app.use('/api/matches/:game/tournament', self.permissionMiddleware('tournament'));
	self.app.post('/api/matches/:game/tournament', function (req, res) {
		var data = req.body || false;
		if (!(data && data.identifier.constructor === String)) {
			res.json({error: 'malformed-query'});
			return;
		}
		self.database.collection('tournaments').findOne({identifier: data.identifier}).then(function (t) {
			if (!t) {
				res.json({error: 'no-tournament'});
				return;
			}
			self.database.collection('matches').updateOne({lobbyId: req.params.game}, {
				$set: {
					'tournamentInfo.isTournament': true,
					'tournamentInfo.identifier': data.identifier
				}
			}).then(function (r) {
				if (!r.result.n) {
					res.json({error: 'not-real-match'});
					return;
				}
				if (!r.result.nModified) {
					res.json({error: 'already-added'});
					return;
				}
				res.json({success: true, lobbyId: req.params.game})
			});
		});


	});
};