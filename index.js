var express = require('express');
var app = express();

// rest client => wrong ... it is a FORM request!!
// var Client = require('node-rest-client').Client;
// var client = new Client();

// http://samwize.com/2013/08/31/simple-http-get-slash-post-request-in-node-dot-js/
var requestPost = require('request');
var querystring = require('querystring');


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

app.use(function(req, res, next) {
    console.log( '**GENERAL: session.logginin    = ' + req.session.loggingin);     // Catches access to all other pages
    console.log( '**GENERAL: session.accesstoken = ' + req.session.accessToken);     // Catches access to all other pages
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
    var myCode = request.query.code;
    var state = request.query.state;
    console.log( '*** State = ' + state);
    if( state === null || state === undefined) {
      state = 'munzeefaster';
    }

    var myform = {
      client_id : process.env.CLIENTID,
      client_secret : process.env.CLIENTSECRET,
      grant_type : 'authorization_code',
      code : myCode,
      redirect_uri : redirect_uri
    };
    var formData = querystring.stringify(myform);
    var contentLength = formData.length;
    console.log( "*** Calling POST with object");
    console.log( myform);
    requestPost( {
      headers : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      uri : 'https://api.munzee.com/oauth/login',
      body: formData,
      method : 'POST'
    }, function( error, responsePost, body) {
      // We now receive an immediate response with the tokens
        // console.log( "******* Response: ");
        // console.log( response);
        // console.log( "******* ResponsePost: ");
        // console.log( responsePost);
        console.log( "******* Body: ");
        console.log( body);
        if (!error && response.statusCode === 200) {
          var result = JSON.parse(body);
          console.log( '>>> data = ');
          console.log( result.data);
          console.log( '>>> token = ');
          console.log( result.data.token);
          var access_token = result.data.token.access_token;
          var refresh_token = result.data.token.refresh_token;
          var token_type = result.data.token.token_type;
          var expires = result.data.token.expires;
          var expires_in = result.data.token.expires_in;
          console.log( "Updating Mongodb with user: " + state);
          console.log( "Updating Mongodb with access_token: " + access_token);
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
