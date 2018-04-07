var model = new (function () {
	var self = this;
	self.canBan = localStorage.getItem('apiKey') ? JSON.parse(localStorage.getItem('permissions')).includes('ban') || JSON.parse(localStorage.getItem('permissions')).includes('root') : false;
	self.getData = function () {
		return $.ajax({
			url: './api/admin/bans/ips',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey')})
		}).then(function (r) {
			self.blockedIps(r);
		})
	};
	self.blockedIps = ko.observableArray();
	self.ip = ko.observable('');
	self.blockIp = function () {
		var ip = self.ip();
		self.ip('');
		return $.ajax({
			url: './api/admin/banIP',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), ip: ip})
		}).then(function () {
			self.getData();
		})
	};
	self.unblockIp = function () {
		var ip = this;
		return $.ajax({
			url: './api/admin/unbanIP',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), ip: ip})
		}).then(function () {
			self.getData();
		})
	};
	self.getData();
})();
$(document).ready(function () {
	ko.applyBindings(model);
});