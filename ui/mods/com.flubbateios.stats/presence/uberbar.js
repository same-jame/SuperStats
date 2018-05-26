!function () {
	var setting = api.settings.isSet('ui','superStatsPresence',true);
	var on = setting ?  (setting === "ON" ? true : false) : false;
	handlers.superStatsPleaseReloadUberbar = function () {
		window.location.reload();
	}
	if(!on){
		return;
	}
	model.jabberPresenceUserStatus = ko.observable();
	$('input[data-bind="value: jabberPresenceStatus"]').attr('data-bind', "value: jabberPresenceUserStatus,attr:{placeholder:(jabberPresenceStatus() && jabberPresenceStatus().length) ? jabberPresenceStatus() : 'Enter a status message' }");
	model.jabberPresenceUserStatus.subscribe(function(r){
		if(r === ''){
			model.jabberPresenceUserStatus(undefined);
		}
	})
	model.presenceCurrentSceneInfo = ko.observable({
			scene: 'start',
			text: ''
		});
	model.updateJabberPresence = function () {
		if (model.jabberPresenceUserStatus()) {
			model.jabberPresenceStatus(model.jabberPresenceUserStatus());
		} else {
			model.jabberPresenceStatus(model.presenceCurrentSceneInfo().text)
		}
	}
	model.jabberPresenceUserStatus.subscribe(model.updateJabberPresence);
	model.presenceCurrentSceneInfo.subscribe(model.updateJabberPresence);
	console.log('Super Stats presence stuff loaded.');
	handlers.superStatsPresence = function (payload) {
		model.presenceCurrentSceneInfo(payload);
	};
	
}
()
