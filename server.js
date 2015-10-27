var http = require('http');
var sockjs = require('sockjs');
var node_static = require('node-static');

var pp = require('prttty')

var Graphmalizer = require('graphmalizer-core');
var H = require('highland')

var config = {
    Neo4J: { host: 'localhost', port: 7474 },
    types: {
        thing: { node:{} },
        eats: { arc:{} },
        same: { equivalence: {} }
    }
}

var G = new Graphmalizer(config)

// 1. Echo sockjs server
var sockjs_opts = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js"};

var sockjs_echo = sockjs.createServer(sockjs_opts);
sockjs_echo.on('connection', function(conn) {

    var input = H()

    conn.on('data', function(message) {
      try {
        var o = JSON.parse(message)
        console.log("RECV =>", pp.render(o))
        o.dataset = 'interactive'
        input.write(o)
        input.write({query: 'graph'})
      }
      catch(e)
      {
        console.error(e && (e.stack || e))
        input.write(e)
      }

    });

    G.register(input)
      .errors(function(err){
        // console.error(err);
        conn.write(JSON.stringify(err));
      })
      .each(function(rr){
        console.log(rr);
        conn.write(JSON.stringify(rr));
      });
});

// 2. Static files server
var static_directory = new node_static.Server(__dirname);

// 3. Usual http stuff
var server = http.createServer();
server.addListener('request', function(req, res) {
    static_directory.serve(req, res);
});
server.addListener('upgrade', function(req,res){
    res.end();
});

sockjs_echo.installHandlers(server, {prefix:'/echo'});

console.log(' [*] Listening on 0.0.0.0:9999' );
server.listen(9999, '0.0.0.0');
