

function parseTokens(route) {
	return route./*route.replace(/\//g,' ').*/replace(/\s+/g,' ').split(' ');
}

function splitOr(tokens, route, routes, start) {

	for(var i = start, n = tokens.length; i < n; i++) {
		var token = tokens[i];

		if(token.toLowerCase() == 'or') {
			var orRoute = route.concat();

			orRoute.pop();

			//skip one token
			orRoute.push(tokens[++i]);

			splitOr(tokens, orRoute, routes, i + 1);

			//this chunk of code will execute if we get a chain of OR statements such as:
			//-method=GET OR -method=POST OR -method=PUT. In which case, we need to skip them.     
			while(i < n - 1 && tokens[i + 1].toLowerCase() == 'or') {
				i += 2;
			}
		} else {
			route.push(token);
		}
	}


	routes.push(route);

	return routes;
}


function parseChannel(channel) {

	var paths = channel instanceof Array ? channel : channel.replace(/^\/|\/$/g,'').split(/[\s\/]+/g);

	var expr = { value: paths.join('/'), paths: [] };

	for(var i = 0, n = paths.length; i < n; i++) {
		var path = paths[i],
		isParam = (path.substr(0,1) == ':');

		expr.paths.push({ value: isParam ? path.substr(1) : path, param: isParam });
	}

	return expr;
}

function parseRouteChannels(rootExpr, tokens, start) {

	var n = tokens.length,
	currentExpression = rootExpr;
	currentExpression.channel = parseChannel(tokens[n - 1]);


	// console.log(start)
	for(var i = n - 2; i >= start; i--) {
		  
		var token = tokens[i], buffer = [];


		if(token == '->') continue;

		/*while(i >= start && token && token != '->') {

			buffer.unshift(token);
			token = tokens[--i];
		}*/


		//middleware flag - skip  
		

		currentExpression = currentExpression.thru = { channel: parseChannel(token) };
	}

	/*if(rootExpr.channel.paths[rootExpr.channel.paths.length - 1 ].value == '*') {
		rootExpr.channel.paths.pop();
		rootExpr.middleware = true;
	}*/

	return rootExpr;
}

function fixRoute(route, grammar) {
	
	for(var expr in grammar) {
		route = route.replace(grammar[expr], expr);
	}

	return route;
}


function parseRoute(route, grammar) {

	if(grammar) {
		route = fixRoute(route, grammar);
	}

	var tokens = parseTokens(route),
	routes = splitOr(tokens, [], [], 0),
	currentRoute,
	expressions = [];


	for(var i = 0, n = routes.length; i < n; i++) {
		
		var routeTokens = routes[i],
		expr = { tags: {} },
		start = 0;
		
		if(routeTokens[0].match(/^\w+$/) && routeTokens[1] != '->' && routeTokens.length-1)
		{
			start = 1;
			expr.type = routeTokens[0];
		}

		for(var j = start, jn = routeTokens.length; j < jn; j++) {
			
			var routeToken = routeTokens[j];

			//is it a tag?
			if(routeToken.substr(0, 1) == '-') {
				
				var tagParts = routeToken.split('=');

				var tagName = tagParts[0].substr(1);//remove the dash
				
				expr.tags[tagName] = tagParts.length > 1 ? tagParts[1] : true;

				//continue until there are no more tags
				continue;
			} 

			expressions.push(parseRouteChannels(expr, routeTokens, j));
			break;
		}
	}


	return expressions;
}


module.exports = function(source, grammar) {
	return parseRoute(source, grammar);
}


module.exports.grammar = function(grammar) {
	
	return {
		fixRoute: function(source) {
			return fixRoute(source, grammar);
		},
		parse: function(source) {
			return parseRoute(source, grammar);
		}
	}
}


module.exports.parseChannel = parseChannel;

module.exports.stringifyPaths = function(paths, params) {
	var stringified = [];
	if(!params) params = {};

	for(var i = 0, n = paths.length; i < n; i++) {

		var path = paths[i], pathValue;

		if(path.param) {
			pathValue = params[path] || ':' + path.value;
		} else {
			pathValue = path.value;
		}

		stringified.push(pathValue);

	}

	return stringified.join('/');
}


module.exports.stringifyTags = function(tags) {
	var stringified = [];

	for(var tagName in tags) {
		var tagValue = tags[tagName];

		if(tagValue === true) {
			stringified.push('-' + tagName);
		} else {
			stringified.push('-' + tagName+'='+tagValue);
		}
	}

	return stringified.join(' ');
}



module.exports.stringify = function(route) {
	
	var stringified = [];
	
	if(route.type) stringified.push(route.type);

	stringified.push(module.exports.stringifyTags(route.tags));
	stringified.push(module.exports.stringifyPaths(route.channel.paths));
	
	return stringified.join(' ');
}