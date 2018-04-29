(function () {
	model.lobbyId = ko.observable('');
	handlers.lobbyId = model.lobbyId;
	model.superStatsReported = ko.observable(true);
	handlers.superStatsInfo = function (e) {
		model.superStatsReported(e.reported);
	}
	model.goToSuperStats = function () {
		engine.call('web.launchPage', 'https://flubbateios.com/stats/match.html?match=' + model.lobbyId().toLowerCase());
	};
	$('input[value="REVIEW"]').parent().before('<div data-bind="visible:superStatsReported"><input type="button" value="SUPER STATS" data-bind="click:goToSuperStats" /></div>');
})()