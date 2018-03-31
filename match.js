ko.bindingHandlers.graph = {
	update: function (el, valueAccessor) {
		if (el.graph) {
			el.graph.destroy();
		}
		var data = ko.unwrap(valueAccessor());
		var d2 = _.cloneDeep(data);
		if (!d2) {
			return;
		}
		d2.bindto = el;
		el.graph = bb.generate(d2);
	}
};
var model = new (function () {
	var self = this;
	self.getData = function (q) {
		return $.getJSON('./test.json');
		//return $.getJSON('./api/match/' + q);
	};
	self.data = ko.observable(false);
	self.unitLists = new (function () {
		var that = this;
		that.types = ['defense', 'fabbers', 'factories', 'mobile'];
		for (var x of that.types) {
			that[x] = [];
		}
		that.init = function () {
			var proms = [];
			for (var x of that.types) {
				(function (q) {
					var p = $.getJSON('./assets/data/' + q + '.json');
					p.done(function (r) {
						that[q] = r
					})
				})(x)
			}
			return $.when.apply(null, proms);
		};
	})();
	self.gameInfo = new (function () {
		var that = this;
		that.lobbyId = ko.computed(function () {
			return self.data().lobbyId;
		});
		that.isTitans = ko.computed(function () {
			return self.data().isTitans;
		});
		that.isRanked = ko.computed(function () {
			return self.data().isRanked;
		});
		that.isCustomServer = ko.computed(function () {
			return self.data().isCustomServer;
		});
		that.buildVersion = ko.computed(function () {
			return self.data().buildVersion;
		});
		that.equilibrium = ko.computed(function(){
			return self.data() && self.data().serverMods.map( r => {return r.identifier.includes('com.pa.n30n.equilibrium')} ).includes(true)
		});
		that.legion = ko.computed(function(){
			//accounts for balance branches
			return self.data() && self.data().serverMods.map( r => {return r.identifier.includes('com.pa.legion-expansion-server')} ).includes(true)
		})
	})();
	self.gameTimeInfo = new (function () {
		var that = this;
		that.duration = ko.computed(function () {
			if (!self.data()) {
				return false;
			}
			if (!self.data().gameEndTime) {
				return 0;
			}
			return self.data().gameEndTime - self.data().gameStartTime;
		});
		that.durationString = ko.computed(function () {
			if (!that.duration()) {
				return 'unknown';
			}
			return moment(that.duration()).format('mm:ss');
		});
		that.startTimeString = ko.computed(function () {
			if (!self.data()) {
				return false;
			}
			return moment(self.data().gameStartTime).format('DD/MM/YYYY HH:mm:ss');
		});
		//These durations will be slightly different. On 100% sim speed, It will be approximately 5 seconds out due to the landing sequence.
		that.gameDuration = ko.computed(function(){
			if(!self.data()){
				return false
			}
			var highest = 0;
			for(var x of self.rawArmies()){
				if(x.dataPointsStats.length){
					for(var y of x.dataPointsStats){
						if (y.time > highest){
							highest = y.time;
						}
					}
				}
			}
			return highest;
		});
		that.gameDurationString = ko.computed(function(){
			if(!self.data()){
				return '0'
			}
			return moment(that.gameDuration() * 1000).format('mm:ss')
		});
	})();
	self.tournamentInfo = ko.computed(function () {
		return self.data().tournamentInfo || {};
	});
	//rawArmies is only for other computeds to process this info. NOT to be used for actual UI.
	self.rawArmies = ko.computed(function () {
		if (!self.data()) {
			return [];
		}
		var armies = _.cloneDeep(self.data().armies);
		for (var x of armies) {
			//turning deltas into actual unit counts for unit display and also unit count a bit later...
			var uData = [];

			function findUnitData(time) {
				var o = [];
				for (var q of x.dataPointsUnit) {
					if (q.time === time) {
						o.push(q)
					}
				}
				return o;
			}
			//initialize the unit data timings thing whatever
			for (var y of x.dataPointsUnit) {
				var f = false;
				for (var q of uData) {
					if (q.time === y.time) {
						f = true;
					}
				}
				if (!f) {
					uData.push({time: y.time, realTime: y.realTime, units: []})
				}

			}
			for (var O in uData) {
				var item = uData[O];
				item.units = (O > 0) ? _.cloneDeep(uData[O - 1].units) : [];
				var deltas = findUnitData(item.time);
				for (var p of deltas) {
					var found = false;
					for (var q of item.units) {
						if (p.unit === q.unit) {
							found = q;
						}
					}
					if (!found) {
						item.units.push({unit: p.unit, count: p.delta})
					} else {
						found.count += p.delta;
						if (found.count === 0) {
							item.units.splice(item.units.indexOf(found), 1)
						}
					}

				}
			}
			x.fullUnitData = uData;

			//figuring out stats
			var avgApm = 0;
			var apmc = 0;
			for (var y of Object.keys(x.dataPointsApm)) {
				var p = x.dataPointsApm[y];
				for (var z of p) {
					avgApm += z.apm;
					apmc++;
				}
			}
			x.averageApm = Object.keys(x.dataPointsApm).length ? Math.round(avgApm / apmc) : 0;
			//we're going to find the area under the graph with some trapezia.
			//using game time since real time is not accurate for total metal used/wasted/whatever because of time dilation in-game
			//I'm pretentious enough to use the word 'trapezia'
			var effPoints = 0;
			var totalEff = 0;

			function getFloorUnits(time) {
				var latest = {time: 0, realTime: 0, units: []};
				for (var u of x.fullUnitData) {
					if ((u.time <= time) && (u.time > latest.time)) {
						latest = u;
					}
				}
				return latest;
			}
			for (var y in x.dataPointsStats) {
				var A = x.dataPointsStats[y];
				var B = (y - 1 >= 0) ? x.dataPointsStats[y - 1] : {
					metalProd: 0,
					metalLoss: 0,
					metalStorage: 0,
					metalStored: 0,
					energyProd: 0,
					energyLoss: 0,
					energyStorage: 0,
					energyStored: 0,
					simSpeed: 0,
					time: 0,
					realTime: 0,
					metalSpent: 0,
					metalWasted: 0,
					energySpent: 0,
					energyWasted: 0,
					currentMetalWastage: 0,
					currentEnergyWastage: 0,
					metalProduced: 0,
					energyProduced: 0
				};
				A.currentMetalWastage = (A.metalStored >= (A.metalStorage * 0.98)) ? (A.metalProd - A.metalLoss) : 0;
				//A.currentMetalWastage = (A.metalStored === A.metalStorage) ? (A.metalProd - A.metalLoss) : 0;
				A.metalWasted = Math.round(B.metalWasted + ((B.currentMetalWastage + A.currentMetalWastage) * 0.5 * (A.time - B.time)));
				delete B.currentMetalWastage;
				A.currentEnergyWastage = (A.energyStored >= (A.energyStorage * 0.98)) ? (A.energyProd - A.energyLoss) : 0;
				//A.currentEnergyWastage = (A.energyStored ===A.energyStorage ) ? (A.energyProd - A.energyLoss) : 0;
				A.energyWasted = Math.round(B.energyWasted + ((B.currentEnergyWastage + A.currentEnergyWastage) * 0.5 * (A.time - B.time)));
				delete B.currentEnergyWastage;

				var BMetalUse = (B.metalStored <= (B.metalStorage * 0.02)) ? Math.min(B.metalLoss, B.metalProd) : B.metalLoss;
				var AMetalUse = (A.metalStored <= (A.metalStorage * 0.02)) ? Math.min(A.metalLoss, A.metalProd) : A.metalLoss;

				A.metalSpent = Math.round(B.metalSpent + (BMetalUse + AMetalUse) * 0.5 * (A.time - B.time));
				var BEnergyUse = Math.min(B.energyLoss, B.energyProd);
				var AEnergyUse = Math.min(A.energyLoss, A.energyProd);
				A.energySpent = B.energySpent + (BEnergyUse + AEnergyUse) * 0.5 * (A.time - B.time);

				A.metalProduced = Math.round(B.metalProduced + (B.metalProd + A.metalProd) * 0.5 * (A.time - B.time));
				A.energyProduced = Math.round(B.energyProduced + (B.energyProd + A.energyProd) * 0.5 * (A.time - B.time));

				A.netMetal = A.metalProd - A.metalLoss;
				A.netEnergy = A.energyProd - A.energyLoss;
				var mEff = A.metalStored >= (A.metalStorage * 0.02) ? 1 : Math.min(1, Math.max(A.metalProd / A.metalLoss, 0));
				var eEff = A.energyStored >= (A.energyStorage * 0.02) ? 1 : Math.min(1, Math.max(A.energyProd / A.energyLoss, 0));
				var eff = eEff * mEff;
				A.mEff = Math.round(mEff * 10000) / 100;
				A.eEff = Math.round(eEff * 10000) / 100;
				A.eff = Math.round(eff * 10000) / 100;
				effPoints++;
				totalEff += A.eff;

				var unitState = getFloorUnits(A.time);
				A.unitCount = 0;
				A.defensiveUnits = 0;
				A.mobileUnits = 0;
				A.factories = 0;
				A.fabbers = 0;
				for (var u of unitState.units) {
					A.unitCount += u.count;
					if (self.unitLists.defense.includes(u.unit)) {
						A.defensiveUnits += u.count;
					}
					if (self.unitLists.mobile.includes(u.unit)) {
						A.mobileUnits += u.count;
					}
					if (self.unitLists.factories.includes(u.unit)) {
						A.factories += u.count;
					}
					if (self.unitLists.fabbers.includes(u.unit)) {
						A.fabbers += u.count;
					}
				}
				//we round this time because graphs look bad otherwise
				A.realTime = Math.round(A.realTime/5000) * 5000;
			}
			x.averageEfficiency = x.dataPointsStats.length ? Math.round((100 * totalEff) / effPoints) / 100 + '%' : 0;
			x.metalProduced = x.dataPointsStats.length ? x.dataPointsStats[x.dataPointsStats.length - 1].metalProduced : 0;
			x.energyProduced = x.dataPointsStats.length ? x.dataPointsStats[x.dataPointsStats.length - 1].energyProduced : 0;
			x.metalWasted = x.dataPointsStats.length ? x.dataPointsStats[x.dataPointsStats.length - 1].metalWasted : 0;
			x.energyWasted = x.dataPointsStats.length ? x.dataPointsStats[x.dataPointsStats.length - 1].energyWasted : 0;
			var muPercByProd = Math.round((x.dataPointsStats[x.dataPointsStats.length - 1].metalSpent / x.dataPointsStats[x.dataPointsStats.length - 1].metalProduced) * 10000) / 100;
			var muPercByWaste = 100 - Math.round((x.dataPointsStats[x.dataPointsStats.length - 1].metalWasted / x.dataPointsStats[x.dataPointsStats.length - 1].metalProduced) * 10000) / 100;
			x.metalUsedPerc = x.dataPointsStats.length ? Math.min(100, muPercByProd, muPercByWaste) + '%' : 0;
			var euPercByProd = Math.round((x.dataPointsStats[x.dataPointsStats.length - 1].energySpent / x.dataPointsStats[x.dataPointsStats.length - 1].energyProduced) * 10000) / 100;
			var euPercByWaste = 100 - Math.round((x.dataPointsStats[x.dataPointsStats.length - 1].energyWasted / x.dataPointsStats[x.dataPointsStats.length - 1].energyProduced) * 10000) / 100;
			x.energyUsedPerc = x.dataPointsStats.length ? Math.min(100, euPercByProd, euPercByWaste) + '%' : 0;
			x.playersString = x.extendedPlayers.map((r) => {
				return r.displayName
			}).join(', ')
		}
		return armies;

	});
	self.armies = ko.computed(function () {
		return ko.mapping.fromJS(self.rawArmies())();
	});
	self.serverMods = ko.computed(function () {
		return self.data() ? ko.mapping.fromJS(self.data().serverMods)() : false;
	});
	self.titleContents = ko.computed(function(){
		if(!self.data()){
			return;
		}
		var out = [];
		var teams = {};
		for (var x of self.rawArmies()) {
			if (!teams[x.teamId.toString()]) {
				teams[x.teamId.toString()] = [];
			}
			for (var y of x.extendedPlayers) {
				teams[x.teamId.toString()].push({displayName:y.displayName,uberId:y.uberId});
			}
		}
		for (var x of Object.keys(teams)) {
			var t = teams[x];
			if (out.length) {
				out.push({text:'vs ',link:false});
			}
			for(var y of t){
				out.push({text:y.displayName,link:'./player.html?player='+y.uberId});
				out.push({text:', ', link:false});
			}
			out = out.slice(0,-1);
			out.push({text:'&nbsp;',link:false});
		}
		return ko.mapping.fromJS(out.slice(0,-1))();

	});
	self.winnerString = ko.computed(function () {
		if (!self.data()) {
			return false;
		}
		for (var x of self.data().armies) {
			if (x.teamId === self.data().winner) {
				var dnames = [];
				for (var y of x.extendedPlayers) {
					dnames.push(y.displayName);
				}
				return dnames.join(', ');
			}
		}
		return 'unkown';
	});
	self.casts = ko.computed(function () {
		return self.data().casts || [];
	});
	self.planets = ko.computed(function () {
		if(!self.data()){
			return [];
		}
		var p = _.cloneDeep(self.data().systemInfo.planets);
		var knownBiomes = ['asteroid','desert','earth','gas','ice','ice-boss','lava','metal','metal-boss','moon','sandbox','tropical'];
		for(var x of p){
			x.planetImg = knownBiomes.includes(x.biome) ? `./assets/img/planets/${x.biome}.png` : './assets/img/planets/unknown.png'
		}
		return ko.mapping.fromJS(p)();
	});
	self.systemName = ko.computed(function () {
		return self.data() ? self.data().systemInfo.name : false;
	});
	self.usingGameTime = ko.observable(true);
	self.graphApmData = ko.computed(function () {
		if (!self.data()) {
			return;
		}

		function selectUser(id, army) {
			for (var x of army.extendedPlayers) {
				if (x.uberId === id) {
					return x.displayName
				}
			}
		}

		var out = {xs: {}, columns: [], colors: {}, selection: {grouped: true}};
		for (var x of self.rawArmies()) {
			for (var y of Object.keys(x.dataPointsApm)) {
				var apmPoints = x.dataPointsApm[y];
				var c = [selectUser(y, x)];
				var t = ['x' + y];
				//we need to filter out black because it won't be visible on the graph.
				out.colors[selectUser(y, x)] = x.primaryColor === '#464646' ? '#ffffff' : x.primaryColor;
				out.xs[c[0]] = t[0];
				for (var z of apmPoints) {
					c.push(z.apm);
					t.push(new Date(self.usingGameTime() ? z.time * 1000 : Math.floor(z.realTime / 10) * 10));
				}
				out.columns.push(c);
				out.columns.push(t);
			}
		}
		return {
			data: out, axis: {
				x: {
					type: 'timeseries',
					tick: {
						format: '%M : %S'
					},
					label: {position: 'outer-center', text: "Time"},

				},
				y: {
					label: {position: 'outer-middle', text: "APM"}
				}
			},
			grid: {
				y: {show: true},
				x: {show: true}
			}/*,
			point: {
				r: 3
			}*/
		}
	});
	self.statInfo = ko.mapping.fromJS([ {
		"id": "unitCount",
		"displayName": "Total Units",
		"yAxis": 0
	},{
		"id": "eff",
		"displayName": "Efficiency",
		"yAxis": 0
	}, {
		"id": "mEff",
		"displayName": "Metal Efficiency",
		"yAxis": 0
	}, {
		"id": "eEff",
		"displayName": "Energy Efficiency",
		"yAxis": 0
	}, {
		"id": "metalProd",
		"displayName": "Metal Income",
		"yAxis": false
	}, {
		"id": "metalLoss",
		"displayName": "Metal Usage",
		"yAxis": false
	}, {
		"id": "metalStorage",
		"displayName": "Metal Storage",
		"yAxis": false
	}, {
		"id": "metalStored",
		"displayName": "Metal Stored",
		"yAxis": 0
	}, {
		"id": "metalWasted",
		"displayName": "Metal Wasted",
		"yAxis": false
	}, {
		"id": "metalSpent",
		"displayName": "Metal Spent",
		"yAxis": false
	}, {
		"id": "metalProduced",
		"displayName": "Metal Produced",
		"yAxis": false
	}, {
		"id": "netMetal",
		"displayName": "Net Metal Income",
		"yAxis": false
	}, {
		"id": "energyProd",
		"displayName": "Energy Income",
		"yAxis": false
	}, {
		"id": "energyLoss",
		"displayName": "Energy Usage",
		"yAxis": false
	}, {
		"id": "energyStorage",
		"displayName": "Energy Storage",
		"yAxis": false
	}, {
		"id": "energyStored",
		"displayName": "Energy Stored",
		"yAxis": 0
	}, {
		"id": "energyWasted",
		"displayName": "Energy Wasted",
		"yAxis": false
	}, {
		"id": "energySpent",
		"displayName": "Energy Spent",
		"yAxis": false
	}, {
		"id": "energyProduced",
		"displayName": "Energy Produced",
		"yAxis": false
	}, {
		"id": "netEnergy",
		"displayName": "Net Energy Income",
		"yAxis": false
	},{
		"id": "mobileUnits",
		"displayName": "Mobile Units",
		"yAxis": 0
	},{
		"id": "fabbers",
		"displayName": "Fabbers",
		"yAxis": 0
	},{
		"id": "factories",
		"displayName": "Factories",
		"yAxis": 0
	},{
		"id": "defensiveUnits",
		"displayName": "Static Defence",
		"yAxis": 0
	}, {
		"id": "simSpeed",
		"displayName": "Sim Speed",
		"yAxis": 0
	}, {
		"id": "apm",
		"displayName": "APM"
	}, {
		"id": "avgApm",
		"displayName": "Average APM"
	}]);
	self.generateStatGraph = function (key, display, yaxis) {
		var out = {xs: {}, columns: [], colors: {}};
		for (var x of self.rawArmies()) {
			if (x.dataPointsStats.length) {
				out.colors[x.playersString] = x.primaryColor === '#464646' ? '#ffffff' : x.primaryColor;
				var points = [x.playersString];
				var time = ['x' + x.armyId];
				out.xs[x.playersString] = 'x' + x.armyId;
				for (var z of x.dataPointsStats) {
					points.push(z[key]);
					time.push(new Date(self.usingGameTime() ? z.time * 1000 : Math.floor(z.realTime / 10) * 10));
				}
				out.columns.push(points);
				out.columns.push(time);
			}
		}
		return {
			data: out, axis: {
				x: {
					type: 'timeseries',
					tick: {
						format: '%M : %S'
					},
					label: {position: 'outer-center', text: "Time"},

				},
				y: {
					label: {position: 'outer-middle', text: display},
					min: (yaxis !== false) ? yaxis : undefined
				}
			},
			grid: {
				y: {show: true},
				x: {show: true}
			}
		}
	};
	self.avgApmGraph = ko.computed(function () {
		function selectUser(id, army) {
			for (var x of army.extendedPlayers) {
				if (x.uberId === id) {
					return x.displayName
				}
			}
		}

		var xValues = ['xaxis'];
		var yValues = ['Average APM'];
		for (var x of self.rawArmies()) {
			for (var y of Object.keys(x.dataPointsApm)) {
				var apmPoints = x.dataPointsApm[y];
				var avg = 0;
				for (var z of apmPoints) {
					avg += z.apm;
				}
				avg = Math.round(avg / (apmPoints.length) * 10) / 10;
				xValues.push(selectUser(y, x));
				yValues.push(avg);
			}
		}
		return {
			data: {x: 'xaxis', columns: [xValues, yValues], type: 'bar', colors: {'Average APM': '#00ccff'}},
			axis: {x: {type: 'category'}, y: {label: {position: 'outer-middle', text: 'Average APM'}}},
			legend: {show: false},
			bar: {width: {ratio: 0.5}}
		};
	});
	self.selectedGraphKey = ko.observable('unitCount');
	self.selectedGraph = ko.computed(function(){
		function getGraphInfo(k){
			for(var x of self.statInfo()){
				if(x.id() === k){
					return ko.mapping.toJS(x)
				}
			}
		}
		var graphKey = self.selectedGraphKey();
		if(graphKey === 'avgApm'){
			return self.avgApmGraph();
		}else if(graphKey === 'apm'){
			return self.graphApmData()
		}else{
			var info  =  getGraphInfo(graphKey);
			return self.generateStatGraph(info.id,info.displayName,info.yAxis)
		}

	});
	self.clickStatGraphButton = function () {
		var button = this;
		self.selectedGraphKey(button.id());
	};
	self.usingStrategicIcons = ko.observable(true);
	self.currentUnitTime = ko.observable(0);
	self.searchTime = ko.computed(function(){
		return self.usingGameTime() ? self.currentUnitTime() : self.currentUnitTime() * 1000;
	});
	self.endUnitTimeString = ko.computed(function(){
		return self.usingGameTime() ? self.gameTimeInfo.gameDurationString() : self.gameTimeInfo.durationString();
	});
	self.endUnitTime = ko.computed(function(){
		return self.usingGameTime() ? self.gameTimeInfo.gameDuration() : self.gameTimeInfo.duration()/1000;
	});
	self.currentUnitTimeString = ko.computed(function(){
		return moment(self.currentUnitTime() * 1000).format('mm:ss')
	});
	self.strategicIconOverrides = {
		'com.pa.n30n.equilibrium':{base:'equilibrium_',units:['orbital_probe']}
	};
	self.generateStrategicIconUrl = function(unit){
		var url = './assets/strategic_icons/';
		var u = unit.split('/').pop().replace('.json','');
		for(var x of self.data().serverMods){
			if(self.strategicIconOverrides[x.identifier]){
				if(self.strategicIconOverrides[x.identifier]['units'].includes(u)){
					url += self.strategicIconOverrides[x.identifier].base;
				}
			}
		}
		var p_url = url + 'primary/icon_si_' + u + '.png';
		var s_url = url + 'shadow/icon_si_' + u + '.png';
		return {primary:p_url,shadow:s_url};
	};
	self.buildBarIconOverrides = {};
	self.generateBuildBarIconUrl = function(unit){
		var u = unit.split('/').pop().replace('.json','');
		var url = './assets/build_bar_icons/';
		for(var x of self.data().serverMods){
			if(self.buildBarIconOverrides[x.identifier]){
				if(self.buildBarIconOverrides[x.identifier]['units'].includes(u)){
					url += self.buildBarIconOverrides[x.identifier].base;
				}
			}
		}
		url += ('icons/' + u + '.png');
		return url;
	};
	self.generateUnitDbUrl = function(unit){
		var u = unit.split('/').pop().replace('.json','');
		return 'https://flubbateios.com/equilibrium/db/unit/' + u;
	};
	self.currentUnits = ko.computed(function () {
		var out = [];
		var q = _.cloneDeep(self.rawArmies());
		for (var x of q) {
			var equal = false;
			var highest = {time: 0, realTime: 0,units:[]};
			for (var y of x.fullUnitData) {
				var time = self.usingGameTime() ? y.time : y.realTime;
				if (time > highest.time && time <= self.searchTime()) {
					highest = y;
				}
				if (time === self.searchTime() || (!self.usingGameTime())) {
					equal = true;
				}
			}
			for(var z of highest.units){
				z.buildBarUrl = self.generateBuildBarIconUrl(z.unit);
				var k = self.generateStrategicIconUrl(z.unit);
				z.shadowUrl =k.shadow;
				//this gets used in a CSS mask so we need a url() wrapper
				z.primaryUrl = 'url(' +  k.primary + ')' ;
				z.unitDb = self.generateUnitDbUrl(z.unit);
			}
			out.push({
				data: highest.units,
				primaryColor: x.primaryColor,
				secondaryColor: x.secondaryColor,
				playersString: x.playersString,
				exact: equal
			});
		}
		return ko.mapping.fromJS(out)();
	});
	self.selectedPlanetName = ko.observable('');
	self.selectPlanet = function(){
		var that = this;
		self.selectedPlanetName(that.name())
	};
	self.planets.subscribe(function(){
		self.selectedPlanetName(self.planets()[0].name());
	});
	self.selectedPlanet = ko.computed(function(){
		for(var x of self.planets()){
			if(x.name() === self.selectedPlanetName()){
				return x;
			}
		}
	});
	self.show404 = ko.observable(false);
	self.unitLists.init().then(function () {
		return self.getData(qs.match);
	}).then(function (r) {
		if (!r || r.error) {
			self.show404(true);
			return;
		}
		self.data(r);
	}).catch(function(){
		self.show404(true);
	});
})();
$(document).ready(function () {
	ko.applyBindings(model);
});
