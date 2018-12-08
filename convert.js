var request = require('request');
module.exports = function (u, p) {
	var self = this;
	self.data = {
		"TitleId": 4,
		"AuthMethod": "UberCredentials",
		"UberName": u,
		"Password": p
	};
	self.sessionToken = '';
	self.start = function(){
		self.authenticate();
		self.authenticateInterval = setInterval(self.authenticate,10 * 60 * 1000);
	}
	self.authenticate = function () {
		request({
			url: 'https://4.uberent.com/GC/Authenticate',
			method: 'POST',
			body: self.data,
			json: true
		}, function (a, b, response) {
			if (typeof response === "object") {
				self.sessionToken = response.SessionTicket || self.sessionToken;
			}
		});
	};
	self.convertUser = function (e, t) {
		return new Promise(function (res, rej) {
			if (!self.sessionToken) {
				res(false);
				return;
			}
			var frm = {};
			frm[t] = e;
			request({
				url: 'https://4.uberent.com/GameClient/UserId',
				method: 'GET',
				headers: {
					'X-Authorization': self.sessionToken
				},
				form: frm

			}, function (a, b, r) {
				if (!r) {
					res(false);
					return;
				}
				var re = JSON.parse(r);

				if (re.ErrorCode) {
					res(false)
				} else {
					res(re.UberId)
				}
			})

		});
	};

}
