var express = require('express');
var app = express();
var path = require('path');

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

//  session cookie authentication
app.use(session({
    secret: '2C44-4D44-WppQ38S',
    cookie: {expires: new Date(253402300000000)}
}));

// Authentication and Authorization Middleware
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// General FILTER -- if not logging in ... do some checking
app.use(function(req, res, next) {
    console.log( "*** GENERAL: url = " + req.url + ", login = " + req.session.loggingin);
    if( req.url.indexOf(".") !== -1) {
      // Serve static pages
      res.sendFile( path.join(__dirname + '/public' + req.url));
      return ;
    }
    // if logged in ...
    if( req.session.loggingin === undefined || req.session.loggingin === null || req.session.loggingin === false) {
      // Is there a username in the session cookie? No, then navigate to the login page
      console.log( '*** GENERAL: no.login session.user = ' +  req.session.username + ', session.token = ' + req.session.accesstoken);
      var usernameLastVisit = req.session.username;
      if( usernameLastVisit === undefined || usernameLastVisit === null) {
        req.session.accesstoken = null;
        req.session.loggingin = true;
        console.log( '*** GENERAL => to login.html');
        res.redirect('/login.html');
        return;
      } else {
        // Was the last action of the user > 8 hours?
        var lastVisitLongerThan8hoursAgo = ((new Date).getTime()) - ( 8 * 60 * 60000);
        var lastVisit = req.session.lastvisit;
        console.log( ' last visit = ' + lastVisit);
        req.session.lastvisit = ((new Date).getTime());
        if( lastVisit === undefined || lastVisit === null || lastVisit < lastVisitLongerThan8hoursAgo) {
          // Will a token expire?
          console.log( "GENERAL: finding use in db ... " + req.session.username);
          collection.findOne( { "user" : usernameLastVisit},{},function(error,doc){
            if( doc === undefined || doc === null) {
              req.session.accesstoken = null;
              req.session.loggingin = true;
              res.redirect('/login.html');
              return ;
            } else {
              // will the access token expiry witin 8 hours?
              var nowPlus8Hours = (((new Date).getTime()) + (8*60*60000) );
              console.log( ">>>> Now plus 8 hours: " + nowPlus8Hours);
              if( doc.expires < nowPlus8Hours) {
                console.log( ">>>> Access token expires within 8 hours: " + doc.expires);
                // Will the authentication also expire? Get in 1 go both tokens!
                if( doc.auth_expires < nowPlus8Hours || doc.refresh_token === null) {
                  console.log( ">>>> Auth token expires within 8 hours: " + doc.auth_expires);
                  loginToMunzee( usernameLastVisit, req, res);
                  return ;
                } else {
                  refreshAccessToken( usernameLastVisit, doc.refresh_token, req, res);
                  return ;
                }
              }
            }
        });
      }
      // OK - no filtering needed.
      if( req.url === "/" ) {
        res.sendFile( path.join(__dirname + '/public/index.html'));
        return ;
      } else {
        // other routing requests
        next();
      }
    }
  } else {
    // Via next() ga je verder met routing !!!!!!!
    next();
  }
});

app.post("/login", function (req, res, next) {
    console.log( '*** /login: body.user = ' +  req.body.usernam);
    collection.findOne( { "user" : req.body.username},{},function(e,doc) {
      if( doc !== undefined && doc !== null && req.body.username === doc.user &&
          req.body.password === doc.pw) {
        console.log( '*** LOGGING IN ');
        // Valid (re)login
        // Is there a token OR is it expired?
        req.session.username = req.body.username;
        req.session.loggingin = false;
        var nowPlus8Hours = (((new Date).getTime()) + (8*60*60000) );
        console.log( 'Now plus 8 hours: ' + nowPlus8Hours);
        if( doc.auth_expires < nowPlus8Hours || doc.refresh_token === null || doc.refresh_token === undefined) {
          console.log( ">>>> Authentication token expires within 8 hours: " + doc.auth_expires);
          loginToMunzee( req.body.username, req, res);
        } else if( doc.expires < nowPlus8Hours) {
          console.log( 'Doc.expires ' + doc.expires + " < " + nowPlus8Hours);
          refreshAccessToken( req.body.username, doc.refresh_token, req, res);
        } else {
          req.session.accesstoken = doc.access_token;
          res.redirect('/index.html');
        }
      } else {
        console.log( 'Invalid username or password');
        req.session.username = null;
        req.session.accesstoken = null;
        req.session.loggingin = true;
        res.redirect('/login.html');
      }
    });
});

app.use( '/logout', function(req, res, next) {
  console.log( '*** /logout: session.user = ' +  req.session.username + ', session.token = ' + req.session.accesstoken);
  req.session.accesstoken = null;
  req.session.username = null;
  req.session.loggingin = true;
  res.redirect('/login.html');
});

app.get( "/munzeefaster",function(request, response) {
    console.log( '*** /munzeefaster: session.user = ' +  request.session.username + ', session.token = ' + request.session.accesstoken);
    loginToMunzee( request.session.username, request, response);
});

app.get("/refreshtoken",function(req, res) {
  console.log( '*** /refreshtoken: session.user = ' +  req.session.username + ', session.token = ' + req.session.accesstoken);
  var usernameLastVisit = req.session.username;
  collection.findOne( { "user" : usernameLastVisit},{},function(error,doc){
    console.log( '*** Refresh token');
    console.log( doc);
    if( doc === undefined || doc === null) {
      req.session.accesstoken = null;
      req.session.loggingin = true;
      res.redirect('/login.html');
      return ;
    }
    refreshAccessToken( usernameLastVisit, doc.refresh_token, req, res);
  });
});
// code=JkEQQmjgbPavmqtJtbYEyAD7lYAMYLKBEZhlfeTn&state=yourinfo
app.get("/handle_oauth",function(request, response){
    console.log( "*** /handle_oauth: query.code = " +  request.query.code + ', query.state = ' + request.query.state);    // depricated: var id = request.param('id');
    var myCode = request.query.code;
    var stateUsername = request.query.state;
    console.log( '*** State = ' + stateUsername);
    if( stateUsername === null || stateUsername === undefined) {
      stateUsername = 'munzeefaster';
    }
    getTokens( 'authorization_code', stateUsername, myCode, request, response);
  });

app.use(express.static( __dirname + '/public'));
var port = process.env.PORT || 8000;
app.listen(port);

function loginToMunzee( username, request, response) {
  console.log( "*** loginToMunzee: username = " + username);
  // TODO: de variabele zouden uit de security moeten komen.
  var clientid = process.env.CLIENTID;
  var munzeeRQ = "https://api.munzee.com/oauth?response_type=code&client_id=" +
        clientid + "&redirect_uri=" + redirect_uri + "&scope=read&state=" + username;
  console.log( "*** LOGIN: " + munzeeRQ);
  response.redirect( munzeeRQ);
}

function getTokens( typeOfToken, username, myCode, request, response) {
  console.log( "*** getTokens: username = " + username + ", typeOftoken  = " + typeOfToken + ", code = " + myCode);
  var myform;
  if( typeOfToken === 'authorization_code') {
    myform = {
      client_id : process.env.CLIENTID,
      client_secret : process.env.CLIENTSECRET,
      grant_type : typeOfToken,
      code : myCode,
      redirect_uri : redirect_uri
    };
  } else {
    myform = {
      client_id : process.env.CLIENTID,
      client_secret : process.env.CLIENTSECRET,
      grant_type : typeOfToken,
      refresh_token : myCode,
      redirect_uri : redirect_uri
    };
  }
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
        var expires = result.data.token.expires * 1000;
        var expires_in = result.data.token.expires_in;
        console.log( "---- update access token >>> ");
        request.session.accesstoken = access_token;
        console.log( "---- update access token <<< ");
        console.log( "Updating Mongodb with user: " + username);
        console.log( "Updating Mongodb with access_token: " + access_token);
        if( typeOfToken === 'authorization_code') {
          var auth_expires = ((new Date).getTime()) + (90*24*60*60000);
          // 'state' = username
          console.log( "Update auth code: ");
          collection.update( { "user": username },
                             { $set: { "access_token":access_token,
                                       "refresh_token" : refresh_token,
                                       "token_type": token_type,
                                       "expires": expires,
                                       "expires_in": expires_in,
                                       "auth_expires" : auth_expires
                                        }});
        } else {
          console.log( "Update refresh code: ");
          collection.update( { "user": username },
                             { $set: { "access_token":access_token,
                                       "token_type": token_type,
                                       "expires": expires,
                                       "expires_in": expires_in
                                        }});
        }
      } else {
        console.log( "Error: " + error);
      }
      response.redirect('/index.html');
  });
}

function refreshAccessToken( username, refreshToken, request, response) {
  console.log( "*** refreshAccessToken: username = " + username +
               ", refreshToken = " + refreshToken);
   getTokens( 'refresh_token', username, refreshToken, request, response);
}
