var model = new (function () {
	var self = this;
	self.username = ko.observable('');
	self.password = ko.observable('');
	self.redirectUrl = qs.return || './index.html';
	self.canSignIn = ko.computed(function () {
		return self.username().split(' ').join('') && self.password().split(' ').join('');
	});
	self.signedIn = ko.observable(false);
	self.error = ko.observable(false);
	self.signIn = function () {
		self.signedIn(true);
		var postItem = JSON.stringify({
			username: self.username(),
			password: self.password()
		});
		$.ajax({
			method: 'POST',
			url: './api/users/getkey',
			dataType: 'json',
			contentType: 'application/json',
			data: postItem
		}).then(function (r) {
			if (r.error) {
				switch (r.error) {
					case 'malformed-query':
						self.error('Malformed query');
						break;
					case 'too-many-requests':
						self.error('Too many requests. Try again later.');
						break;
					case 'no-user':
						self.error('Username doesn\'t exist');
						break;
					case 'wrong-password':
						self.error('Incorrect password.');
						break;
					default:
						self.error('Something went wrong.');
						break;
				}
				return;
			}
			if (!r.apiKey) {
				self.error('You have not been assigned any roles.');
				return;
			}
			localStorage.setItem('username', r.username);
			localStorage.setItem('apiKey', r.apiKey);
			//Initial permission set here
			$.getJSON('./api/users/roles?key=' + localStorage.getItem('apiKey')).done(function (e) {
				if (e.error || (!e.permissions.length)) {
					self.signOut();
					return;
				}
				localStorage.setItem('permissions', JSON.stringify(e.permissions));
			});
			window.location.href = self.redirectUrl;
		}).catch(function (e) {
			switch (e.status) {
				case 404:
					self.error('404 Not Found. Is the server down?');
					break;
				default:
					self.error('Something went wrong.');
					break;
			}
		})
	}
})();
$(document).ready(function () {
	ko.applyBindings(model);
});