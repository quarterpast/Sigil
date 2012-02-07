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
		var state = {tag:"",scope:[]},
		sigils = {
			"$": function variable_(expr) {
				return vm.createScript(expr);
			},
			"@": function list_(expr) {
				state.scope.push(expr);
				state.tag = "@";
				return blank;
			},
			"%": function scope_(expr) {
				state.scope.push(expr);
				state.tag = "%";
				return blank;
			},
			"?": function if_(expr) {
				state.scope.push(expr);
				state.tag = "?";
				return blank;
			},
			"!": function else_(expr) {
				state.scope.push(expr);
				var close = '';
				if(state.tag) {
					this["/"](expr);
					close = state.tag;
				}
				state.tag = "!";
				return blank;
			},
			"/": function end_(expr) {
				console.log(state.tag,state.scope)
				state.scope.pop();
				state.tag = "";
				return blank;
			},
			"<": function include_(expr) {
				return blank;
			},
			">": function extend_(expr) {
				return blank;
			},
			"*": function exit_(expr) {
				assert.equal(expr,undefined);
				return function(){throw new Exit};
			}
		}, promises = [];
		text += "*{}";
		text.replace(
			/([\s\S]*?)([\*~#@%&\$:\/])\{([a-z\$_][a-z\$_\d]*)?\}/gi,
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