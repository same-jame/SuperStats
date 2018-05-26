!function () {
	var f = function(r){
		var p = r === "coui://ui/main/game/system_editor/system_editor.html" ? 'System Designer' : 'Selecting System';
		api.Panel.message('uberbar','superStatsPresence',{scene:'system_editor',text:p});
	}
	model.nextSceneUrl.subscribe(f);
	f(model.nextSceneUrl())
	
}()
