const assert = require("assert"),
vm = require("vm");
require("sugar");
Function.prototype.runInNewContext = function(env) {
	var keys = Object.keys(env),
	vals = Object.values(env);

	var str = "return ("+this.toString()+"());";
	return (new Function(keys.join(","),str)).apply(null,vals);
};
Object.isNodeScript = function(obj) {
	return ({}).toString.call(obj) === '[object NodeScript]';
};
var Sigil = {
	compile: function(text) {
		function blank(){return "";}
		function Exit(){}
		var defers = {},
		sigils = {
			"$": function variable_(expr) {
				if(!expr) return null;
				return vm.createScript(expr);
			},
			"@": function list_(expr) {
				return blank;
			},
			"%": function scope_(expr) {
				return blank;
			},
			"?": function if_(expr) {
				return blank;
			},
			"!": function else_(expr) {
				return blank;
			},
			"/": function end_(expr) {
				return blank;
			},
			"<": function include_(expr) {
				return blank;
			},
			">": function extend_(expr) {
				return blank;
			},
			"*": function exit_(expr) {
				assert.equal(expr,"");
				return function(){throw new Exit};
			}
		}, promises = [];
		text += "*{}";
		text.replace(
			/([\s\S]*?)([\*~#@%&\$:\/])\{([^\n\r\}]*)\}/g,
			function(m,before,sigil,expr) {
				var out = sigils[sigil](expr);
				before && promises.push(before);
				promises.push(out);
			}
		);
		assert.throws(promises.pop(), Exit);
		return {
			exec: function(env) {
				return promises.map(function(p) {
					if(Object.isFunction(p) || Object.isNodeScript(p)) {
						return p.runInNewContext(env);
					}
					return p;
				}).join("");
			}
		};
	}
};

console.log(Sigil.compile("<h1>${title}</h1>\n\
<ul>\n\
@{list}\
<li>${}</li>\n\
/{list}\
</ul>\n\
and finally").exec({
	title: "This is the title.",
	list: [
		"this",
		"is",
		"a",
		"list"
	]
}));