var model = new (function () {
	var self = this;
	self.users = ko.observableArray();
	self.getUsers = function () {
		return $.ajax({
			url: './api/admin/users/list',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey')})
		}).then(function (r) {
			self.users(ko.mapping.fromJS(r)());
		});
	};
	self.deleteUser = function () {
		var user = this.username();
		$.ajax({
			url: './api/admin/users/delete',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), username: user})
		}).then(self.getUsers);
	};
	self.keys = ko.observableArray();
	self.linkedUsers = ko.computed(function () {
		var n = [];
		for (var x of self.users()) {
			var app = {username: x.username};
			for (var y of self.keys()) {
				if (y.apiKey() === x.apiKey()) {
					app.info = y.info();
				}
			}
			if (!app.info) {
				app.info = '';
			}
			n.push(app);
		}
		return ko.mapping.fromJS(n)();
	});
	self.latestKey = ko.observable('');
	self.getKeys = function () {
		return $.ajax({
			url: './api/admin/keys/list',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey')})
		}).then(function (r) {
			self.keys(ko.mapping.fromJS(Object.keys(r).map(function (e) {
				r[e].apiKey = e;
				return r[e];
			}))());
		});
	};
	self.info = ko.observable('');
	self.makeKey = function () {
		$.ajax({
			url: './api/admin/keys/add',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), info: self.info()})
		}).then(function (e) {
			self.latestKey(e.apiKey);
			self.getKeys();
		});
		self.info('');
	};
	self.selectedKey = ko.observable('');
	self.permissions = ko.observableArray(["root", "ban", "alter-matches", "roles", "community-mod", "cast", "tournament"]);
	self.selectedPermissions = ko.observableArray();
	self.modifiedInfo = ko.observable('');
	self.applyPermissions = function () {
		var perms = self.selectedPermissions();
		var key = self.selectedKey();
		var info = self.modifiedInfo();
		self.selectedKey('');
		self.selectedPermissions([]);
		$.ajax({
			url: './api/admin/keys/modify',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				apiKey: localStorage.getItem('apiKey'),
				key: key,
				permissions: perms,
				info: info
			})
		}).then(self.getKeys);
	};
	self.showKeyList = ko.observable(false);
	self.toggleShowKeyList = function () {
		self.showKeyList(!self.showKeyList())
	};
	self.deleteKey = function () {
		var that = this;
		$.ajax({
			url: './api/admin/keys/remove',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				apiKey: localStorage.getItem('apiKey'),
				key: that.apiKey()
			})
		}).then(self.getKeys);
	};
	self.selectedLinkKey = ko.observable('');
	self.selectedLinkUser = ko.observable('');
	self.linkKeyAndUser = function () {
		var k = self.selectedLinkKey();
		var u = self.selectedLinkUser();
		$.ajax({
			url: './api/admin/users/linkapi',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				apiKey: localStorage.getItem('apiKey'),
				key: k,
				user: u
			})
		}).then(function () {
			self.getUsers();
			self.getKeys();
		});
	};
	self.getUsers();
	self.getKeys();
})();
$(document).ready(function () {
	ko.applyBindings(model);
});