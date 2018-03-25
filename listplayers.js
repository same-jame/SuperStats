var model = new (function(){
	var self = this;
	//Using this getData function because I have a static testing file
	self.getData = function () {
		return $.getJSON('./testPlayerList.json')
		//return $.getJSON('./api/player/list');
	};
	self.data = ko.observable(false);
	self.showUberIds = ko.observable(false);
	self.searchString = ko.observable('');
	self.searchStringProcessed = ko.computed(function(){
		return self.searchString().replace(/[^A-Za-z0-9]/g, '').toLowerCase();
	});
	self.sortedData = ko.computed(function(){
		if(!self.data()){
			return false;
		}
		var d = _.cloneDeep(self.data());
		var n = [];
		for(var x of d){
			var search_test = x.displayName.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
			if(search_test.includes(self.searchStringProcessed())){
				n.push(x);
			}
		}
		return ko.mapping.fromJS(n)();
	});
	self.redirectToPlayerPage = function(){
		var that = this;
		var link = './player.html?player=' + that.uberId();
		window.open(link);
	};
	self.getData().then(function(r){
		self.data(r);
	});
})();
$(document).ready(function(){
	ko.applyBindings(model);
});