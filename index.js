var express = require('express');
var app = express();

// rest client => wrong ... it is a FORM request!!
// var Client = require('node-rest-client').Client;
// var client = new Client();

// http://samwize.com/2013/08/31/simple-http-get-slash-post-request-in-node-dot-js/
var requestPost = require('request');

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
    console.log( '***** Handle oauth: request object')
    console.log( request);
    console.log( '***** Handle oauth: response object')
    console.log( response);
    var code = request.query.code;
    var state = request.query.state;
    var myheaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    };
    var options = {
      url : 'https://api.munzee.com/oauth/login',
      method : 'POST',
      headers : myheaders,
      form : {
        "clientid" : process.env.CLIENTID,
        "client_secret" : process.env.CLIENTSECRET,
        "grant_type" : "authorization_code",
        "code" + code,
        "redirect_uri" : redirect_uri
      }
    };
    console.log( "*** Calling POST with object");
    console.log( options);
    requestPost( options, function (error, responsePost, body) {
      // We now receive an immediate response with the tokens
        // console.log( "******* Response: ");
        // console.log( response);
        console.log( "******* ResponsePost: ");
        console.log( responsePost);
        console.log( "******* Body: ");
        console.log( body);
        if (!error && response.statusCode == 200) {
          var access_token = body.access_token;
          var refresh_token = body.refresh_token;
          var token_type = body.token_type;
          var expires = body.expires;
          var expires_in = body.expires_in;
          // 'state' = username
          collection.update( { "user": state },
                             { $set: { "access_token":access_token,
                                       "refresh_token" : refresh_token,
                                       "token_type": token_type,
                                       "expires": expires,
                                       "expires_in": expires_in
                                        }});
        } else {
          console.log( "Error: " + error); 
        }
        response.redirect('/index.html');
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
