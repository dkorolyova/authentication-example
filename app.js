require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;



const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded());

app.use(session({
  secret: 'Secret.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://root:example@127.0.0.1:27017/userDB?authSource=admin", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    const userSchema = new mongoose.Schema({
      email: String,
      password: String,
      googleId: String,
      facebookId: String
    });

    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const User = new mongoose.model("User", userSchema);

    passport.use(User.createStrategy());

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      User.findById(id, function(err, user) {
        done(err, user);
      });
    });

    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secret"
      },
      function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({
          googleId: profile.id
        }, function(err, user) {
          return cb(err, user);
        });
      }
    ));

    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secret"
      },
      function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
          facebookId: profile.id
        }, function (err, user) {
          return cb(err, user);
        });
      }
    ));

    app.get("/", function(req, res) {
      res.render("home", {
        user: req.user
      });
      console.log(req.session.user);
    });

    app.get("/auth/google",
      passport.authenticate("google", { scope: ["profile"] }));

    app.get("/auth/google/secret",
      passport.authenticate("google", { failureRedirect: "/login" }),
      function(req, res) {
        res.redirect("/");
    });

    app.get("/auth/facebook",
      passport.authenticate("facebook", { scope: "public_profile"})
    );

    app.get("/auth/facebook/secret",
      passport.authenticate("facebook", { failureRedirect: "/login" }),
      function(req, res) {
        res.redirect("/");
      });

    app.get("/login", function(req, res) {
      res.render("login");
    });

    app.post("/login", function(req, res) {
      const user = new User({
        username: req.body.username,
        password: req.body.password
      });

      req.login(user, function(err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/");
          });
        }
      });
    });

    app.get("/submit", function(req, res) {
      if (req.isAuthenticated()) {
        res.render("submit");
      } else {
        res.redirect("/login");
      }
    });


    app.get("/logout", function(req, res) {
      req.logout();
      res.redirect("/");
    });

    app.get("/register", function(req, res) {
      res.render("register");
    });

    app.post("/register", function(req, res) {
      User.register({
        username: req.body.username
      }, req.body.password, function(err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        }

        passport.authenticate('local')(req, res, function() {
          res.redirect("/");
        });
      });
    });
  });


app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
