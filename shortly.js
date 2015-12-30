var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require("express-session");

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//define the session
app.use(session({resave: true, saveUninitialized: true, secret: "ILOVEUNICORNS", cookie: {maxAge: 60000}}));

//create a local storage to store the session id?
//if user is not logged in, redirect to login page
//if user is logged in, we can create a property & value to show that it's true
//if not, the value is false and redirect to login

//check at every request, create a function to check if the session is true or not
//if not redirect to the login


app.get('/', util.checkUser,
function(req, res) {
    res.render('index');
});


app.get('/create', util.checkUser,
function(req, res) {
    res.render('index');
});

app.get('/links', util.checkUser,
function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
});

app.get('/login',
function(req, res) {
    //render login page
    res.render('login');
});

app.get('/signup',
function(req, res) {
    //render signup page
    res.render('signup');
});

app.post('/links', util.checkUser,
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login', function(req, res){
  var theUser = req.body.username;
  var thePass = req.body.password;

  //go into our collection to get the model's password
  // Users.

  //check for username
  var user = new User({username: theUser}).fetch().then(function(found){
    //if the username is found
    if (found) {
      var hash = found.get('password');
      // console.log('THIS IS THE USER INFO', found);
      found.compare(thePass, hash).then(function(result){
        if(result === true){
           //create a session object
          req.session.userId = theUser;
          //redirect to the homepage
          res.redirect("/");
        } else {
          //if the password is not found, return an error
          // console.log('Not a valid password: ', thePass);
          return res.render("login");
        }
      });
    } else {
      //if the username is not found
      console.log('Not a valid password: ', thePass);
      return res.redirect("/login");
    }
  });
});






app.post('/signup', function(req, res){
  // console.log(req.body);
  // console.log(req.body.username);
  // console.log(req.body.password);

  var theUser = req.body.username;
  var thePass = req.body.password;

  //the fetch the username from the database
  new User({username: theUser}).fetch().then(function(found){
    //check for the user in the database
    if (found) {
      res.send(200, console.log('User Exists!'));
    } else {
      console.log('INSIDE RESOLVE: IS THIS WORKING??');
      //create the new user
      var user = new User({username: theUser, password: thePass});
      //trigger the save here and in users.js model will trigger event 'creating' & call the hash function
      //Promise will run inside of the users.js model
      user.save().then(function(model){
        console.log('isnside then', model);
        //bookshelf adds the model to the Users collection
        Users.add(model);

        //create a session object
        req.session.userId = theUser;
        //redirect to the homepage
        res.redirect("/");

      }).catch(function(err){if(err) console.log(err)});
    }
  });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
