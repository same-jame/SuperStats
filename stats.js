const express = require('express');
const io = require('socket.io');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');
const bodyParser = require('body-parser');
const scrypt = require('scrypt-async');
const UberConverter = require('./convert.js');
const wsHandler = require('./ws.js');
const publicapis = require('./apis.js');
const adminapis = require('./admin.js');
const userapis = require('./users.js');
const communityapis = require('./community.js');
module.exports = function (data) {
	var self = this;
	self.webServerInfo = {
		hostname: data.hostname || 'localhost',
		hostport: data.hostport || 80,
		reverseProxy:data.reverseProxy || false
	};
	self.dbInfo = data.dbInfo || {
		host: 'localhost',
		db: 'test',
		port: '27017'
	};
	self.PABuildVersion = data.PABuildVersion || 108271;
	self.initialUser = data.initialUser || false;
	self.converter = new UberConverter(data.APIUberName, data.APIUberPass);
	self.dbAuth = data.dbAuth || false;
	self.app = express();
	self.app.use(bodyParser.json());
	self.server = http.createServer(self.app);
	self.wServer = new io(self.server, {
		path: '/api/ws',
		wsEngine: 'uws'
	});
	self.connectedAPIs = [];
	self.connectToDatabase = function () {
		var url = self.dbAuth ?
			'mongodb://' + encodeURIComponent(self.dbAuth.username) + ':' + encodeURIComponent(self.dbAuth.password) + '@' + self.dbInfo.host + ':' + self.dbInfo.port + '/' + self.dbInfo.db + '?authMechanism=DEFAULT&authSource=' + self.dbAuth.authDB :
			'mongodb://' + self.dbInfo.host + ':' + self.dbInfo.port + '/' + self.dbInfo.db;
		return MongoClient.connect(url).then(function (d) {
			self.database = d;
			console.log(new Date().toUTCString()+ ' Database connected')
		}).catch(function (err) {
			console.log(new Date().toUTCString() + ' DATABASE CONNECTION FAILED EVACUATE WE\'RE SO DEAD!!!!!!!!');
		});
	};
	self.activeGames = [];
	self.bannedIPs = [];
	self.bannedIds = [];
	self.apis = [];
	self.users = {};
	self.apiKeys = {};
	self.synchronizeWithInfoDB = function(key){
		var data = {content:self[key],tag:key};
		return self.database.collection('info').updateOne({tag:key},data,{upsert:true});
	};
	self.permissionMiddleware = function(permission){
		return function(req,res,next){
			var apiKey =req.body ? req.body.apiKey : false;
			if(!(apiKey && (apiKey.constructor.name ==="String") &&  (apiKey.length === 32))){
				res.json({error:'no-apikey'});
				return;
			}
			if(!self.apiKeys[apiKey]){
				res.json({error:'not-authenticated'});
				return;
			}
			if(self.apiKeys[apiKey].permissions.includes(permission) || self.apiKeys[apiKey].permissions.includes('root')){
				next();
			}else{
				res.json({error:'permission-denied'})
			}

		}
	};
	self.IPMiddleware = function(req,res,next){
		var IP = self.webServerInfo.reverseProxy ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
		if(self.bannedIPs.includes(IP)){
			res.json({error:'banned'});
		}else{
			next();
		}
	};
	//for rate limit
	self.webServerInfo.reverseProxy && self.app.enable('trust proxy');
	self.app.use(self.IPMiddleware);
	wsHandler(self);
	publicapis(self);
	adminapis(self);
	userapis(self);
	communityapis(self);
	self.initServer = function () {
		self.connectToDatabase().then(function (r) {
			if(!self.database){
				//goodbye cruel world
				process.exit(1);
				return;
			}
			//there shouldn't be many people in any of these lists
			self.database.collection('info').findOne({tag: 'apiKeys'}).then(function (r) {
				self.apiKeys = r ? r.content : {};
			});
			self.database.collection('info').findOne({tag: 'users'}).then(function (r) {
				self.users = r ? r.content : {};
			});
			self.database.collection('info').findOne({tag: 'bannedIds'}).then(function (r) {
				self.bannedIds = r ? r.content : [];
			});
			self.database.collection('info').findOne({tag: 'bannedIPs'}).then(function (r) {
				self.bannedIPs = r ? r.content : [];
			});
			if(self.initialUser && !Object.keys(self.users).length){
				self.apiKeys[self.initialUser.apiKey] = {
					info:'initialUser',
					permissions:['root']
				};
				self.users[self.initialUser.username] = {
					salt:self.initialUser.salt,
					apiKey:self.initialUser.apiKey
				};
				scrypt(self.initialUser.password, self.initialUser.salt, {
					encoding: 'hex',
					N: 16384,
					r: 8,
					p: 1
				},function(e){
					self.users[self.initialUser.username].hash = e;
					self.synchronizeWithInfoDB('users');
					self.synchronizeWithInfoDB('apiKeys');
				})
			}
		});
		self.converter.authenticate();
		self.server.listen(self.webServerInfo.hostport, self.webServerInfo.hostname);
	}
};
