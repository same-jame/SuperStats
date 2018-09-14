var removeSpaces = function (e) {
	return e.split(' ').join('');
};
var model = new (function () {
	var self = this;
	self.urlData = {};
	try {
		self.urlData = JSON.parse(qs.info);
	} catch (e) {
	}
	self.outsideData = ko.observable(!!self.urlData.identifier);
	self.identifier = ko.observable(self.urlData.identifier || '');
	self.name = ko.observable(self.urlData.name || '');
	self.link = ko.observable(self.urlData.link || '');
	self.cast = ko.observable(self.urlData.cast || '');
	self.time = new (function () {
		var that = this;
		var e = new Date();
		that.year = ko.observable(e.getUTCFullYear());
		that.month = ko.observable(e.getUTCMonth() + 1);
		that.day = ko.observable(e.getUTCDate());
		that.hour = ko.observable(e.getUTCHours());
		that.minute = ko.observable(e.getUTCMinutes());
		that.timeString = ko.computed({
			read: function () {
				return (that.hour() > 9 ? that.hour() : '0' + that.hour()) + ':' + (that.minute() > 9 ? that.minute() : '0' + that.minute());
			},
			write: function (e) {
				var k = e.split(':');
				that.hour(parseInt(k[0]));
				that.minute(parseInt(k[1]));
			}
		});
		that.date = ko.computed({
			read: function () {
				return Date.UTC(that.year(), that.month() - 1, that.day(), that.hour(), that.minute());
			},
			write: function (q) {
				var e = new Date(q);
				that.year(e.getUTCFullYear());
				that.month(e.getUTCMonth() + 1);
				that.day(e.getUTCDate());
				that.hour(e.getUTCHours());
				that.minute(e.getUTCMinutes());
			}
		});
		self.urlData.date && that.date(self.urlData.date);
	})();
	self.live = ko.observable(self.urlData.live === undefined ? false : self.urlData.live);
	self.canSubmit = ko.computed(function () {
		return self.identifier().length && self.name().length;
	});
	self.error = ko.observable('');
	self.submitted = ko.observable(false);
	self.submit = function () {
		self.submitted(true);
		var postItem = {
			apiKey: localStorage.getItem('apiKey'),
			date: self.time.date(),
			identifier: self.identifier(),
			name: self.name(),
			live: self.live()
		};
		if (removeSpaces(self.cast()).length) {
			postItem.cast = self.cast();
		}
		if (removeSpaces(self.link()).length) {
			postItem.link = self.link();
		}
		$.ajax({
			url: './api/tournaments/modify_or_add',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify(postItem),
			method: 'POST'
		}).then(function (r) {
			if (r.error) {
				self.error(r.error);
				return;
			}
			window.location.href = './tournaments.html';
		});
	};
	/*
	if(localStorage.getItem('apiKey') ? (!JSON.parse(localStorage.getItem('permissions')).includes('tournament')) : true) {
		alert('You don\'t have permission to do this!');
		window.location.href = './index.html';
	}
	*/
});
$(document).ready(function () {
	ko.applyBindings(model);
});