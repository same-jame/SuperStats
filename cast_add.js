var model = new (function () {
	var self = this;
	self.lobbyIdDisabled = ko.observable(!!qs.lobbyId);
	self.lobbyId = ko.observable(qs.lobbyId || '');
	self.redirectUrl = ko.computed(function () {
		return './match.html?match=' + self.lobbyId();
	});
	self.link = ko.observable('');
	self.username = ko.observable(localStorage.getItem('username') || '');
	// the fallback to an empty string is for testing purposes
	self.submitted = ko.observable(false);
	self.msg = ko.observable('');
	self.canSubmit = ko.computed(function () {
		return self.username().split(' ').join('').length && self.link().length &&
			(self.link().toLowerCase().includes('youtube.com') || self.link().toLowerCase().includes('twitch.tv')) && self.lobbyId().length && (!self.submitted());
	});
	self.submitCast = function () {
		self.submitted(true);
		var toPost = JSON.stringify({
			apiKey: localStorage.getItem('apiKey'),
			user: self.username(),
			link: self.link()
		});
		$.ajax({
			method: 'POST',
			url: './api/matches/' + self.lobbyId() + '/cast',
			dataType: 'json',
			contentType: 'application/json',
			data: toPost
		}).then(function (r) {
			if (r.error) {
				//not using truefalse just in case more detailed error messages are added to this page.
				self.msg(r.error);
				return;
			}
			window.location.href = self.redirectUrl();
		});
	};
	/*
	if(localStorage.getItem('apiKey') ? (!JSON.parse(localStorage.getItem('permissions')).includes('cast')) : true) {
		alert('You don\'t have permission to do this!');
		window.location.href = './index.html';
	}
	*/
})();
$(document).ready(function () {
	ko.applyBindings(model);
});