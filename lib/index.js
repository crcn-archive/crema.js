//crema code here

function parseTokens(route) {
	return route.toLowerCase().replace(/\s+/,' ').split(' ');
}

function splitOr(tokens, route, routes, start) {

	for(var i = start, n = tokens.length; i < n; i++) {
		var token = tokens[i];

		if(token == 'or') {
			var orRoute = route.concat();

			orRoute.pop();

			//skip one token
			orRoute.push(tokens[++i]);

			splitOr(tokens, orRoute, routes, i + 1);

			//this chunk of code will execute if we get a chain of OR statements such as:
			//-method=GET OR -method=POST OR -method=PUT. In which case, we need to skip them.     
			while(i < n - 1 && tokens[i + 1] == 'or') {
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
	
	var paths = channel.replace(/^\/|\/$/g,'').replace(/\/+/,'/').split('/');

	var expr = { value: channel, paths: [] };

	for(var i = 0, n = paths.length; i < n; i++) {
		var path = paths[i];

		expr.paths.push({ value: path, param: path[0] == ':' });
	}

	return expr;
}

function parseRouteChannels(rootExpr, tokens, start) {
	
	var n = tokens.length,
	currentExpression = rootExpr;
	currentExpression.channel = parseChannel(tokens[n - 1]);

	for(var i = n - 2; i >= start; i--) {
		  
		var token = tokens[i];

		//middleware flag - skip  
		if(token == '->') {
			continue;
		}

		currentExpression = currentExpression.thru = { channel: parseChannel(token) };
	}


	return rootExpr;
}


function parseRoute(route, expressions) {
	
	var tokens = parseTokens(route),
	routes = splitOr(tokens, [], [], 0),
	currentRoute,
	expressions = [];

	for(var i = 0, n = routes.length; i < n; i++) {
		
		var routeTokens = routes[i],
		expr = { type: routeTokens[0], tags: {} };

		for(var j = 1, jn = routeTokens.length; j < jn; j++) {
			
			var routeToken = routeTokens[j];

			//is it a tag?
			if(routeToken[0] == '-') {
				
				var tagParts = routeToken.split('=');

				var tagName = tagParts[0].substr(1);//remove the dash
				
				expr.tags[tagName] = !!tagParts.length ? tagParts[1] : true;

				//continue until there are no more tags
				continue;
			} 

			expressions.push(parseRouteChannels(expr, routeTokens, j));
			break;
		}
	}


	return expressions;
}


module.exports = function(source) {
	return parseRoute(source);
}