!function () {
	_.extend(api.settings.definitions.ui.settings, {
		superStatsPresence: {
			title: 'Send Extended Presence Info',
			type: 'select',
			default:'ON',
			options: ['ON', 'OFF']
		}
	});
	model.settingDefinitions(api.settings.definitions);
	model.settingsItemMap()['ui.superStatsPresence'].value.subscribe(function(){
		api.Panel.message('uberbar','superStatsPleaseReloadUberbar');
	})
	$('.option-list.ui').append(
		'<div class="sub-group">' +
		'<div class="sub-group-title">Super Stats</div>' +
		'<div class="option" data-bind="template:{name:\'setting-template\',data:$root.settingsItemMap()[\'ui.superStatsPresence\']}"></div>'+
		'</div>')
}();
