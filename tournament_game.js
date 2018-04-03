var model = new (function () {
	var self = this;
	self.tournaments = ko.observableArray([]);
	self.mappedTournaments = ko.computed(function () {
		return ko.mapping.fromJS(self.tournaments())();
	});
	self.lobbyId = ko.observable(qs.lobbyId || '');
	self.cantEditLobbyId = ko.observable(!!qs.lobbyId);
	self.identifier = ko.observable('');
	self.submitted = ko.observable(false);
	self.error = ko.observable('');
	self.submit = function () {
		$.ajax({
			url: `./api/matches/${self.lobbyId()}/tournament`,
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				apiKey: localStorage.getItem('apiKey'),
				identifier: self.identifier()
			}),
			method: 'POST'
		}).then(function (r) {
			if (r.error) {
				self.error(r.error);
				return;
			}
			window.location.href = './match.html?match=' + self.lobbyId();
		});
	};
	/*
	if(localStorage.getItem('apiKey') ? (!JSON.parse(localStorage.getItem('permissions')).includes('tournament')) : true) {
		alert('You don\'t have permission to do this!');
		window.location.href = './index.html';
	}
	*/
	$.getJSON('./api/tournaments/list').then(function (r) {
		self.tournaments(r);
	});
})();
$(document).ready(function () {
	ko.applyBindings(model);
});