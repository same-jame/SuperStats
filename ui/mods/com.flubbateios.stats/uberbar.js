model.openSuperStatsPage = function(){
	var e = this;
	engine.call('web.launchPage','https://flubbateios.com/stats/player.html?player=' + e.uberId());
};
$('[data-bind="click: viewReplays"]').parent().after("<li><a data-bind=\"click: $root.openSuperStatsPage\" tabindex=\"-1\" href=\"#\"><span class=\"menu-action\">\n <loc>Super Stats</loc>\n</span></a></li>");