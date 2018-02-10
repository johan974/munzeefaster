var express = require('express');
var app = express();
const dbuser = process.env.MONGODB_USERNAME;
const dbpass = process.env.MONGODB_PASSWORD;
var URL = 'mongodb://' + dbuser + ':' + dbpass + '@ds229008.mlab.com:29008/munzeefastermongodb';
var MongoClient = require('mongodb').MongoClient;
var db;
var session = require('express-session');
var bodyParser = require('body-parser')

// Database setup
console.log( "Testing mongodb>>")
MongoClient.connect(URL, function(err, database) {
    if (err) {
      console.log( 'Cannot connect to mongodb' + err);
      return
    }
    db = database.db('munzeefastermongodb');
    db.collection('accounts').find().toArray(function(err, results) {
      console.log(results)
      // send HTML file populated with quotes here
    })
  });
console.log( "Testing mongodb<<")

//  session authentication
app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));
// Authentication and Authorization Middleware
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.post("/login", function (req, res) {
    console.log( 'Username' + req.body.username);
    console.log( 'PW ' + req.body.password);
    var user = getAccount( req.body.username);
    console.log( 'Account' + user);
    req.session.accessToken = 'xyz';
    res.redirect('/index.html');
    res.session.loggingin = false;
    res.end;
    next();
    return;
});
app.use(function(req, res, next) {       // Catches access to all other pages
    if( req.session.loggingin !== null && req.session.loggingin == false && !req.session.accessToken) {       // requiring a valid access token
        console.log( 'Empty access token, redirect to login');
        res.redirect('/login.html');
        res.session.loggingin = true;
        next();
    } else {
        next();
    }
});
app.use( '/logout', function(req, res, next) {
  res.session.accessToken = null;
  res.session.loggingin = true;
  res.redirect('/login.html');
  next();
});

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

function showAccounts() {
  console.log( "Showing the accounts");
  db.collection('accounts').find().toArray(function(err, results) {
    console.log(results)
  })
}
function getAccount( username) {
  return db.collection('accounts').find( { "user" : username });
}
