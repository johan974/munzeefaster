var express = require('express');
var app = express();

// rest client
var Client = require('node-rest-client').Client;
var client = new Client();

const dbuser = process.env.MONGODB_USERNAME;
const dbpass = process.env.MONGODB_PASSWORD;
var URL = 'mongodb://' + dbuser + ':' + dbpass + '@ds229008.mlab.com:29008/munzeefastermongodb';
var mongo = require('mongodb');
var monk = require('monk');
var session = require('express-session');
var bodyParser = require('body-parser');

var db = monk(URL);
var collection = db.get('accounts');
var redirect_uri = "https://munzeefaster.herokuapp.com/handle_oauth";

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
        req.session.accessToken = req.body.username;
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
    var args = {
        data: {
          "clientid" : process.env.CLIENTID,
          "client_secret" : process.env.CLIENTSECRET,
          "grant_type" : "authorization_code",
          "code" : code,
          "redirect_uri" : redirect_uri
        },
        headers: { "Content-Type": "application/json",
                   "Accept": "application/json" }
    };
    client.post( 'https://api.munzee.com/oauth/login', args, function (data, response) {
      // We now receive an immediate response with the tokens
        console.log( "******* Response: ");
        console.log( response);
        console.log( "******* Data: ");
        console.log( data);
        var access_token = data.access_token;
        var refresh_token = data.refresh_token;
        var token_type = data.token_type;
        var expires = data.expires;
        var expires_in = data.expires_in;
        // 'state' = username
        collection.update( { "user": state },
                           { $set: { "access_token":access_token,
                                     "refresh_token" : refresh_token,
                                     "token_type": token_type,
                                     "expires": expires,
                                     "expires_in": expires_in
                                      }});
        response.redirect('/index.html');
    }).on( 'error', function( err) {
      console.log( 'Error: ' + err);
      return ;
    });
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
function loginToMunzee( request, response) {
  // TODO: de variabele zouden uit de security moeten komen. 
  console.log( "Login to munzee... ");
  var clientid = process.env.CLIENTID;
  var munzeeRQ = "https://api.munzee.com/oauth?response_type=code&client_id=" +
        clientid + "&redirect_uri=" + redirect_uri + "&scope=read&state=munzeefaster";
  console.log( "MunzeeURL: " + munzeeRQ);
  response.redirect(munzeeRQ);
}
