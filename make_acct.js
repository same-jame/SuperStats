var model = new (function () {
	var self = this;
	self.signingUp = ko.observable(true);
	self.username = ko.observable('');
	self.password = ko.observable('');
	self.confirmPassword = ko.observable('');
	self.match = ko.computed(function () {
		return self.password() === self.confirmPassword();
	});
	self.passwordIsLongEnough = ko.computed(function(){
		return self.password().length >= 7;
	});
	self.readyToSignUp = ko.computed(function(){
		return self.match() && self.password().length && self.username().split(' ').join('').length && self.passwordIsLongEnough();
	});
	self.error = ko.observable(false);
	self.signUp = function(){
		self.signingUp(false);
		var postItem = JSON.stringify({
			username:self.username(),
			password:self.password()
		});
		$.ajax({
			method:'POST',
			url:'./api/users/create',
			dataType:'json',
			contentType:'application/json',
			data:postItem
		}).then(function(r){
			self.error(r.error);
		});
	}
})();
$(document).ready(function () {
	ko.applyBindings(model);
});