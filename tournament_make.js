var model = new (function(){
	var self = this;
	self.urlData = {};
	try{
		self.urlData = JSON.parse(qs.info);
	}catch(e){}
	self.outsideData = ko.observable(!!self.urlData.identifier);
	self.identifier = ko.observable(self.urlData.identifier || '');
	self.name = ko.observable(self.urlData.name || '');
	self.link = ko.observable(self.urlData.link || '');
	self.cast = ko.observable(self.urlData.cast || '');
	self.time = new (function(){
		var that = this;
		var e = new Date();
		that.year = ko.observable(e.getUTCFullYear());
		that.month = ko.observable(e.getUTCMonth() + 1);
		that.actualMonth = ko.computed({
			read:function(){
				return that.month() - 1
			},write:function(q){
				that.month(q + 1);
			}
		});
		that.day = ko.observable(e.getUTCDate());
		that.hour = ko.observable(e.getUTCHours());
		that.minute = ko.observable(e.getUTCMinutes());
		that.date = ko.computed({
			read:function(){
				return new Date(that.year(),that.actualMonth(),that.day(),that.hour(),that.minute()).getTime()
			},
			write:function(q){
				var e = new Date(q);
				that.year(e.getUTCFullYear());
				that.actualMonth(e.getUTCMonth());
				that.day(e.getUTCDate());
				that.hour(e.getUTCHours());
				that.minute(that.getUTCMinutes());
			}
		});
		self.urlData.time && that.date(self.urlData.time);
	})()

});
$(document).ready(function(){
	ko.applyBindings(model);
});