!function(){
	_.extend(api.settings.definitions.ui.settings, {
		superStatsPresence: {
			title: 'Send Extended Presence Info',
			type: 'select',
			default:'ON',
			options: ['ON', 'OFF']
		}
	});
	api.Panel.message('uberbar','superStatsPresence',{scene:'start',text:''});
	model.enableSuperStatsPresence = function(){
		api.settings.set('ui','superStatsPresence','ON',false);
		api.settings.save();
		model.showSuperStatsMsgPresence(false);
		api.Panel.message('uberbar','superStatsPleaseReloadUberbar');
		localStorage.setItem('superStatsPresencePerms','true');
	};
	model.showSuperStatsMsgPresence = ko.observable(false);
	var shown = decode(localStorage.getItem('superStatsPresencePerms'));
	model.showSuperStatsMsgPresence(!shown);
	var message = '<span>Super Stats has an optional module to allow extended presence status messages, like in PA Chat (e.g. "Viewing Games Browser"). Click the button here to enable it. Presence settings can be changed in SETTINGS => Gameplay => Super Stats</span>';
	var btn = '<button data-bind="click:enableSuperStatsPresence">ENABLE</button>'
	$( '#community-mods-messages' ).prepend( '<div class="community-mods-message important" data-bind="visible:showSuperStatsMsgPresence">'+message+btn+'</div>' );
}()