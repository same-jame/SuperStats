const Validator = require('jsonschema').Validator;
var randomString = function (len, chars) {
	len = len || 1;
	var s = chars || "abcdefghijklmnopqrstuvwxyz0123456789";
	var ticket = "";
	for (var x = 0; x < len; x++) {
		ticket += s.charAt(Math.floor(Math.random() * s.length));
	}
	return ticket;

};
module.exports = function (self) {
	self.app.use('/api/admin/bans/ids', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/bans/ids', function (req, res) {
		res.json(self.bannedIds)
	});
	self.app.use('/api/admin/bans/ips', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/bans/ips', function (req, res) {
		res.json(self.bannedIPs)
	});
	self.app.use('/api/admin/banUser', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/banUser', function (req, res) {
		var victim = req.body.id;
		if (!(victim && (victim.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		if (self.bannedIds.includes(victim)) {
			res.json({error: 'already-banned'});
			return;
		}
		self.bannedIds.push(victim);
		self.synchronizeWithInfoDB('bannedIds').then(function () {
			res.json({error: false, success: true, banned: victim});
		})
	});
	self.app.use('/api/admin/banIP', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/banIP', function (req, res) {
		var victim = req.body.ip;
		if (!(victim && (victim.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		if (self.bannedIPs.includes(victim)) {
			res.json({error: 'already-banned'});
			return;
		}
		self.bannedIPs.push(victim);
		self.synchronizeWithInfoDB('bannedIPs').then(function () {
			res.json({error: false, success: true, banned: victim});
		});
	});
	self.app.use('/api/admin/unbanUser', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/unbanUser', function (req, res) {
		var victim = req.body.id;
		if (!(victim && (victim.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		if (!self.bannedIds.includes(victim)) {
			res.json({error: 'not-banned'});
			return;
		}
		self.bannedIds.splice(self.bannedIds.indexOf(victim), 1);
		self.synchronizeWithInfoDB('bannedIds').then(function () {
			res.json({error: false, success: true, unbanned: victim});
		})
	});
	self.app.use('/api/admin/unbanIP', self.permissionMiddleware('ban'));
	self.app.post('/api/admin/unbanIP', function (req, res) {
		var victim = req.body.ip;
		if (!(victim && (victim.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		if (!self.bannedIPs.includes(victim)) {
			res.json({error: 'not-banned'});
			return;
		}
		self.bannedIPs.splice(self.bannedIPs.indexOf(victim), 1);
		self.synchronizeWithInfoDB('bannedIPs').then(function () {
			res.json({error: false, success: true, unbanned: victim});
		});
	});
	//EMERGENCY USE ONLY
	self.app.use('/api/admin/game/end', self.permissionMiddleware('alter-matches'));
	self.app.post('/api/admin/game/end', function (req, res) {
		var game = req.body ? req.body.game : false;
		if (!(game && (game.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		for (var x of self.games) {
			if (x.lobbyId === game) {
				if (req.body.nodb) {
					x.nodb = true;
				}
				x.endGame();
				res.json({success: true, error: false, game: game});
				return;
			}
		}
		res.json({error: 'no-game'})
	});
	self.app.use('/api/admin/game/purge', self.permissionMiddleware('alter-matches'));
	self.app.post('/api/admin/game/purge', function (req, res) {
		var game = req.body ? req.body.game : false;
		if (!(game && (game.constructor === String))) {
			res.json({error: 'malformed-query'});
			return;
		}
		self.database.collection('matches').deleteOne({lobbyId: game}).then(function (r) {
			var success = r.result.n;
			if (!success) {
				res.json({error: "no-game"});
				return;
			}
			self.database.collection('players').find({matches: game}).toArray().then(function (q) {
				var bulkOperations = [];
				for (var x of q) {
					q.matches.splice(q.matches.indexOf(game));
					bulkOperations.push({updateOne: {filter: {uberId: x.uberId}, update: x}});
				}
				return self.database.collection('players').bulkWrite(bulkOperations)
			}).then(function (q) {
				console.log('test bulkwrite');
				console.log(q);
				res.json({error: false, success: true})
			});
		});
	});
	self.app.use('/api/admin/roles/listkeys', self.permissionMiddleware('roles'));
	self.app.post('/api/admin/roles/listkeys', function (req, res) {
		res.json(self.apiKeys);
	});
	self.app.use('/api/admin/roles/modify', self.permissionMiddleware('roles'));
	self.app.post('/api/admin/roles/modify', function (req, res) {
		var apiKey = req.body ? req.body.key : false;
		if(!(apiKey && (apiKey.constructor === String))){
			res.json({error:'malformed-query'});
			return;
		}
		if(!self.apiKeys[apiKey]){
			res.json({error:'no-key'});
			return;
		}
		var out=  {success:true,updatedInfo:false,updatedPermissions:true,apiKey:apiKey};
		if(req.body.info && req.body.info.constructor === String){
			self.apiKeys[apiKey].info = req.body.info;
			out.updatedInfo = true;
		}
		if(req.body.permissions && req.body.permissions.constructor === Array){
			self.apiKeys[apiKey].permissions = req.body.permissions;
			out.updatedPermissions = true;
		}
		self.synchronizeWithInfoDB('apiKeys').then(function(){
			res.json(out);
		})

	});
	self.app.use('/api/admin/key/remove', self.permissionMiddleware('roles'));
	self.app.post('/api/admin/key/remove', function (req, res) {
		var apiKey = req.body ? req.body.key : false;
		if(!(apiKey && (apiKey.constructor === String))){
			res.json({error:'malformed-query'});
			return;
		}
		if(!self.apiKeys[apiKey]){
			res.json({error:'no-key'});
			return;
		}
		delete self.apiKeys[apiKey];
		self.synchronizeWithInfoDB('apiKeys').then(function(){
			res.json({success:true,error:false,apiKey:newKey});
		})
	});
	self.app.use('/api/admin/keys/add', self.permissionMiddleware('roles'));
	self.app.post('/api/admin/keys/add', function (req, res) {
		delete req.body.apiKey;
		var v = new Validator();
		var schema = {
			type: "object",
			required: ["info"],
			properties:{
				"info":{type:"string",maxLength:100},
				"permissions":{type:"array" ,items:{
					type:"string",
					maxLength:50
				}}
			}
		};
		var valid = v.validate(req.body,schema);
		if(valid.errors.length){
			res.json({error:'malformed-query'});
			return;
		}
		for(var k of Object.keys(self.apiKeys)){
			var item = self.apiKeys[k];
			if(item.info === req.body.info){
				res.json({error:'already-exists'});
				return;
			}
		}
		var newKey = randomString(32);
		self.apiKeys[newkey] = {
			info:req.body.info,
			permissions:req.body.permissions || []
		};
		self.synchronizeWithInfoDB('apiKeys').then(function(){
			res.json({success:true,error:false,apiKey:newKey});
		});
	});
	self.app.use('/api/admin/users/linkapi',self.permissionMiddleware('roles'));
	self.app.post('/api/admin/users/linkapi',function(req,res){
		var apiKey = req.body ? req.body.key : false;
		if(!(apiKey && (apiKey.constructor === String))){
			res.json({error:'malformed-query'});
			return;
		}
		if(!self.apiKeys[apiKey]){
			res.json({error:'no-key'});
			return;
		}
		var user = req.body ? req.body.user : false;
		if(!(user && (user.constructor === String))){
			res.json({error:'malformed-query'});
			return;
		}
		if(!self.users[user]){
			res.json({error:'no-user'});
			return;
		}
		self.users[user].apiKey = apiKey;
		self.synchronizeWithInfoDB('users').then(function(){
			res.json({success:true,error:false});
		});
	});
	self.app.use('/api/admin/users/delete',self.permissionMiddleware('roles'));
	self.app.post('/api/admin/users/delete',function(req,res){
		var d = req.body;
		if(!d){
			res.json({error:'malformed-query'});
			return;
		}
		var user = d.username;
		if(user.constructor !== String){
			res.json({error:'malformed-query'});
			return;
		}
		delete self.users[user];
		self.synchronizeWithInfoDB('users').then(function(){
			res.json({success:true})
		});

	});
	self.app.use('/api/matches/:game/cast/delete',self.permissionMiddleware('community-mod'));
	self.app.post('/api/matches/:game/cast/delete',function(req,res){
		var g =req.params.game;
		var l = req.body.link;
		if(!(g && g.constructor===String && g.length > 5 && g.length<40 && l && l.constructor === String)){
			res.json({error:'malformed-query'});
			return;
		}
		self.database.collection('matches').updateOne({lobbyId:g},{'$pull':{link:req.body.link}}).then(function(r){
			if(!r.results.n){
				res.json({error:'not-real-match'});
				return;
			}
			if(!r.results.nModified){
				res.json({error:'not-real-link'});
				return;
			}
			res.json({success:true});
		});
	});
	self.app.use('/api/matches/:game/tournament/delete',self.permissionMiddleware('community-mod'));
	self.app.use('/api/matches/:game/tournament/delete',function(req,res){
		var g =req.params.game;
		if(!(g && g.constructor===String && g.length > 5 && g.length<40 && l && l.constructor === String)){
			res.json({error:'malformed-query'});
			return;
		}
		self.database.collection('matches').updateOne({lobbyId:req.params.game},{$set:{'tournamentInfo.isTournament':false,'tournamentInfo.identifier':false}}).then(function(r){
			if(!r.result.n){
				res.json({error:'not-real-match'});
				return;
			}
			if(!r.result.nModified){
				res.json({error:'not-actually-tournament'});
				return;
			}
			res.json({success:true,lobbyId:req.params.game});
		});
	});
};