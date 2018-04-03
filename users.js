const Validator = require('jsonschema').Validator;
const RateLimit = require('express-rate-limit');
const crypto = require('crypto');
const scrypt = require('scrypt-async');
module.exports = function (self) {
	//one user per day
	var userLimiter = new RateLimit({
			windowMS: 24 * 60 * 60 * 1000,
			max: 1,
			message: JSON.stringify({error:'too-many-requests'})
		});
	self.app.post('/api/users/create', userLimiter, function (req, res) {
		var packet = req.body;
		var v = new Validator();
		var schema = {
			type: "object",
			properties: {
				username: {
					type: "string",
					maxLength: 20,
					required: true
				},
				password: {
					type: "string",
					minLength: 6,
					maxLength: 100,
					required: true
				}
			}
		};
		var valid = v.validate(packet, schema);
		if (valid.errors.length) {
			res.json({
				error: 'malformed-query'
			});
			return;
		}
		if (self.users[packet.username]) {
			res.json({
				error: 'user-exists'
			});
		}
		var salt = crypto.randomBytes(32).toString('hex');
		packet.username = packet.username.toLowerCase();
		self.users[packet.username] = {
			salt: salt,
			apiKey: false
		};
		scrypt(packet.password, salt, {
			encoding: 'hex',
			N: 16384,
			r: 8,
			p: 1
		}, function (q) {
			self.users[packet.username].hash = q;
			self.synchronizeWithInfoDB('users').then(function(){
				res.json({success:true});
			})
		});
	});
	var getKeyLimiter = new RateLimit({
			windowMS: 60 * 1000,
			max: 10,
			message: JSON.stringify({error:'too-many-requests'})
		});
	self.app.post('/api/users/getkey', getKeyLimiter, function (req, res) {
		var packet = req.body;
		var v = new Validator();
		var schema = {
			type: "object",
			properties: {
				username: {
					type: "string",
					maxLength: 20,
					required: true
				},
				password: {
					type: "string",
					minLength: 6,
					maxLength: 100,
					required: true
				}
			}
		};
		var valid = v.validate(packet, schema);
		if (valid.errors.length) {
			res.json({
				error: 'malformed-query'
			});
			return;
		}
		var username = packet.username;
		username = username.toLowerCase();
		var password = packet.password;
		if (!self.users[username]) {
			res.json({
				error: 'no-user'
			});
			return;
		}
		var salt = self.users[username].salt;
		scrypt(password, salt, {
			encoding: 'hex',
			N: 16384,
			r: 8,
			p: 1
		}, function (q) {
			var hash = self.users[username].hash;
			
			if (hash !== q) {
				res.json({
					error: 'wrong-password'
				});
				return;
			}
			res.json({
				username: username,
				apiKey: (self.users[username].apiKey || false)
			});
		});
	});
	self.app.get('/api/users/roles', function (req, res) {
		var key = req.query.key;
		if (!key) {
			res.json({
				error: 'malformed-query'
			});
			return;
		}
		var user = self.apiKeys[key];
		if (!user) {
			res.json({
				error: 'fake-api-key'
			});
			return;
		}
		res.json({permissions:user.permissions});
	})
};
