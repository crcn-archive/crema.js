 

![Alt ebnf diagram](http://i.imgur.com/v1wdO.png)

## Example

```javascript

var channel = crema('-method=GET authorize');

console.log(channel.tags.method); //GET
console.log(channel.route.paths[0]); //authorize

```


## Use Cases

- [beanpole](beanpole)
- [dolce](dolce)
