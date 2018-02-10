var express = require('express');
var app = express();
const dbuser = process.env.MONGODB_USERNAME;
const dbpass = process.env.MONGODB_PASSWORD;
var URL = 'mongodb://' + dbuser + ':' + dbpass + '@ds229008.mlab.com:29008/munzeefastermongodb';
var mongo = require('mongodb');
var monk = require('monk');
var session = require('express-session');
var bodyParser = require('body-parser');

var db = monk(URL);
var collection = db.get('accounts');

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
app.post("/login", function (req, res, next) {
    collection.findOne( { "user" : req.body.username},{},function(e,doc){
      if( doc !== undefined && doc != null && req.body.username === doc.user &&
          req.body.password === doc.pw) {
        req.session.accessToken = 'xyz';
        req.session.loggingin = false;
        res.redirect('/index.html');
        next();
        return;
      } else {
        console.log( 'Invalid username or password');
        res.redirect('/login.html');
        return;
      }
    });
});
app.use(function(req, res, next) {       // Catches access to all other pages
    if( req.session.loggingin !== null && req.session.loggingin == false &&
        !req.session.accessToken) {       // requiring a valid access token
        console.log( 'Empty access token, redirect to login');
        res.redirect('/login.html');
        res.session.loggingin = true;
        next();
    } else {
        next();
    }
});
app.use( '/logout', function(req, res, next) {
  req.session.accessToken = null;
  req.session.loggingin = true;
  res.redirect('/login.html');
  next();
});

app.get("/munzeefaster",function(request, response){
    loginToMunzee( request, response);
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

app.use(express.static( __dirname + '/public'));
var port = process.env.PORT || 8000;
app.listen(port);

function showAccounts() {
  console.log( "ShowingAccounts() accounts --");
  collection.find({},{},function(e,docs){
    console.log(docs);
    console.log( "ShowingAccounts() the accounts --");
  });
}
function loginToMunzee() {
  var clientid = process.env.CLIENTID;
  var redirect_uri = "https://munzeefaster.herokuapp.com/handle_oauth";
  var munzeeRQ = "https://api.munzee.com/oauth?response_type=code&client_id=" +
        clientid + "&redirect_uri=" + redirect_uri + "&scope=read";
  console.log( "MunzeeURL: " + munzeeRQ);
  res.redirect(munzeeRQ);
  // fetch( munzeeRQ)
  // .then( function( response) {
  //   console.log( response);
  //   return response.json();
  // }).then( function( response2) {
  //   console.log( response2);
  //   console.log( 'Answer: ' + response2.origin);
  // }).catch( function( err) {
  //   console.log( 'Error: ' + err);
  // });
}
