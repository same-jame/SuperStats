!function(){
	var n = 0
	setInterval(function(){
		n++;
		api.Panel.message('uberbar','superStatsPresence',{scene:'matchmaking',text:'Ranked Queue for '+n.toString() + ' ' +( n === 1 ? 'minute' : 'minutes')})
	},6 * 1000)
	api.Panel.message('uberbar','superStatsPresence',{scene:'matchmaking',text:'Ranked Queue'})
}()