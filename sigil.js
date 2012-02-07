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
		var state = {tag:"",scope:[],capture:{}},
		sigils = {
			"$": {
				before: function variable_(expr) {
					this.id = expr;
					if(state.scope.length) {
						this.id = state.scope.join(".")+"["+(
							expr || "i"
						)+"]";
					}
				},
				after: function variable_(expr) {
					return vm.createScript(this.id);
				}
			},
			"@": {
				before: function list_(expr) {
					state.tag = '@';
					state.scope.push(expr);
				},
				after: function list_(expr) {
					return blank;
				}
			},
			"%": {
				before: function scope_(expr) {
					state.tag = '%';
					state.scope.push(expr);
				},
				after: function scope_(expr) {
					return blank;
				}
			},
			"?": {
				before: function if_(expr) {
					state.tag = '?';
					state.scope.push(expr);
				},
				after: function if_(expr) {
					return blank;
				}
			},
			"!": {
				before: function else_(expr) {
					state.tag = '!';
					state.scope.push(expr);
				},
				after: function else_(expr) {
					return blank;
				}
			},
			"/": {
				before: function end_(expr) {
					console.log(state.capture);
				},
				after: function end_(expr) {
					state.tag = '';
					state.scope.pop();
					return blank;
				}
			},
			"<": {
				before: function include_(expr) {
				},
				after: function include_(expr) {
					return blank;
				}
			},
			">": {
				before: function extend_(expr) {
				},
				after: function extend_(expr) {
					return blank;
				}
			},
			"*": {
				before: function exit_(expr) {
					assert.equal(expr,undefined);
				},
				after: function exit_(expr) {
					return blank;
				}
			}
		}, promises = [];
		(text+"*{}").replace(
			/([\s\S]*?)([\*~#@%&\$:\/])\{([a-z\$_][a-z\$_\d]*)?\}/gi,
			function(m,before,sigil,expr) {
				var oldstate = Object.clone(state);
				sigils[sigil].before(expr);
				switch(state.tag) {
					case "?":
					case "!":
					case "/":
					case "@":
					case "%":
						if(!(state.scope.join(".") in state.capture))
							state.capture[state.scope.join(".")] = [];
						if(before) {
							console.log(before)
							if(oldstate.tag != state.tag) {
								promises.push(before);
							} else {
								state.capture[state.scope.join(".")].push(
									before
								);
							}
						}
						state.capture[state.scope.join(".")].push(
							sigils[sigil].after(expr)
						);
					break;
					default:
						before && promises.push(before);
						promises.push(sigils[sigil].after(expr));
				}
			}
		);
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