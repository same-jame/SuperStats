(function () {
	var spec = new (function () {
		var self = this;
		var unit_root = "coui://pa/units/unit_list.json";
		var coui = "coui://";
		self.specTypeMap = {};
		self.unitList = [];
		self.getUnitSpec = function (p) {
			var def = $.Deferred();
			var res = def.resolve;
			$.getJSON(coui + p).done(function (r) {
				var types = r.unit_types;
				if (types) {
					res(types);
				} else if (r.base_spec) {
					self.getUnitSpec(r.base_spec).done(function (u) {
						res(u)
					})
				} else {
					res([]);
				}
			})
			return def;
		};
		self.initSpec = function () {
			$.getJSON(unit_root).done(function (r) {
				self.unitList = r.units;
				for (var x in self.unitList) {
					var unit = self.unitList[x];
					(function (r) {
						self.getUnitSpec(r).done(function (result) {
							self.specTypeMap[r] = result;
						})
					})(unit)
				}
			})
		}
	})();
	spec.initSpec();
	var oldWatch = handlers.watch_list;
	var things = ['UNITTYPE_Factory', 'UNITTYPE_Commander', 'UNITTYPE_Recon', 'UNITTYPE_Important'];
	handlers.watch_list = function (r) {
		var out = {
			list: []
		};
		var l = r.list;
		for (var x in l) {
			var i = l[x];
			if (i.watch_type === 1) {
				if (_.contains(spec.specTypeMap[i.spec_id], 'UNITTYPE_Commander')) {
					out.list.push(i);
				}
			} else if (i.watch_type === 3) {
				out.list.push(i);
			} else {
				if (_.intersection(things, spec.specTypeMap[i.spec_id]).length) {
					out.list.push(i);
				}
			}
		}
		if (out.list.length) {
			oldWatch(out);
		}
	};

	function setupListeners() {
		var listenerTypes = ['watchlist.setCreationAlertTypes', 'watchlist.setDeathAlertTypes'];
		for (var x in listenerTypes) {
			engine.call(listenerTypes[x], '["Mobile", "Structure", "Recon"]', '[]');
		}
	}

	for (var q = 1; q <= 4; q++) {
		setTimeout(setupListeners, 2000 * q);
	}
})()
