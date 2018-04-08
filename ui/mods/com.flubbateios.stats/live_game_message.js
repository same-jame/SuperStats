(function () {
	var p = api.Panel.parentId;
	model.superStatsReporting = ko.observable(true);
	model.superStatsCheckbox = ko.observable(true);
	model.superStatsCanReport = ko.observable(false);
	$('.div_instruct_bar').append('<div data-bind="if:(superStatsCheckbox() && superStatsCanReport())"> <span>Report to Super Stats: </span> <input type="checkbox" data-bind="checked:superStatsReporting"> </div>');
	$('.div_instruct_bar').append('<div data-bind="if:(!superStatsCanReport() && superStatsCheckbox())"> <span>This game will not report to Super Stats; Dynamic Alliance or Sandbox mode are enabled or this is a local server</span> </div>');
	model.superStatsReporting.subscribe(function (r) {
		api.Panel.message(p, 'superStatsReporting', r);
	});
	var o = model.clickButton;
	model.clickButton = function (r) {
		model.superStatsCheckbox(false);
		o(r);
	};
	handlers.superStatsCheckbox = function (r) {
		model.superStatsCheckbox(r);
	};
	handlers.superStatsCanReport = function (r) {
		model.superStatsCanReport(r);
	};
})()