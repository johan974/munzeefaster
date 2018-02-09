var express = require('express');
var app = express();

app.get("/test_pathname_var/:id",function(request, response){
    var id = request.params.id;
    var obj = { id : id, Content : "content " +id };
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
});
// code=JkEQQmjgbPavmqtJtbYEyAD7lYAMYLKBEZhlfeTn&state=yourinfo
app.get("/handle_oauth",function(request, response){
    // depricated: var id = request.param('id');
    var code = request.query.code;
    var state = request.query.state;
    var obj = { "code" : code, "state" : state };
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
});

// app.post('/', function (req, res) {
//   res.send('POST request to the homepage')
// });

app.use(express.static( __dirname + '/public'));
var port = process.env.PORT || 8000;
app.listen(port);
