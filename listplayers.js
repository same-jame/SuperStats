var model = new (function () {
	var self = this;
	//Using this getData function because I have a static testing file
	self.getData = function () {
		//return $.getJSON('./testPlayerList.json')
		return $.getJSON('./api/player/list');
	};
	self.getBanData = function () {
		return $.ajax({
			url: './api/admin/bans/ids',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey')})
		});
	};
	self.data = ko.observable(false);
	self.showUberIds = ko.observable(false);
	self.searchString = ko.observable('');
	self.searchStringProcessed = ko.computed(function () {
		return self.searchString().replace(/[^A-Za-z0-9]/g, '').toLowerCase();
	});
	self.canBan = localStorage.getItem('apiKey') ? JSON.parse(localStorage.getItem('permissions')).includes('ban') || JSON.parse(localStorage.getItem('permissions')).includes('root') : false;
	self.banned = ko.observableArray();
	self.sortedData = ko.computed(function () {
		if (!self.data()) {
			return false;
		}
		var d = _.cloneDeep(self.data());
		var n = [];
		for (var x of d) {
			x.banned = self.banned().includes(x.uberId);
			var search_test = x.displayName.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
			if (search_test.includes(self.searchStringProcessed())) {
				n.push(x);
			}
		}
		return ko.mapping.fromJS(n)();
	});
	self.ban = function () {
		var that = this;
		$.ajax({
			url: './api/admin/banUser',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), id: that.uberId()})
		}).then(function (r) {
			if (r.error) {
				return;
			}
			self.getBanData();
		})
	};
	self.unban = function () {
		var that = this;
		$.ajax({
			url: './api/admin/unbanUser',
			method: 'POST',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({apiKey: localStorage.getItem('apiKey'), id: that.uberId()})
		}).then(function (r) {
			if (r.error) {
				return;
			}
			self.getBanData();
		})
	};
	if (self.canBan) {
		self.getBanData().then(function (r) {
			if (r.error) {
				localStorage.removeItem('apiKey');
				localStorage.removeItem('username');
				localStorage.removeItem('permissions');
				window.location.reload();
				return;
			}
			self.banned(r);
			return self.getData();
		}).then(function (e) {
			self.data(e);
		})
	} else {
		self.getData().then(function (r) {
			self.data(r);
		});
	}

})();
$(document).ready(function () {
	ko.applyBindings(model);
});