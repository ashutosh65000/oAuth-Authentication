require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// const encrypt = require("mongoose-encryption"); level 2
// const md5 = require("md5");  level 3
// const bcrypt = require('bcrypt'); level 4

const app = express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret:"Our little secret is something to do with the world.",
  resave:false,
  saveUninitialized:true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{ useNewUrlParser: true ,useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
// mongoose.set(passport.session());

const userSchema=new mongoose.Schema({
  email: String,
  password: String,
  googleUserID: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// usersSchema.plugin(encrypt,{secret:process.env.SECRETS, encryptedFields:["password"] }); // encrypts entire database if encryptedFields not defined

const User = new mongoose.model("User",userSchema);

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
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleUserID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google",{ scope:["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }), function(req, res) {
    // Successful authentication, redirect secrets .
    res.redirect('/secrets');
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else{
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
  // const newUser=new User({
  //   email:req.body.username,
  //   // password:md5(req.body.password)
  // });
  // newUser.save(function(err){
  //   if(err){
  //     console.log(err);
  //   } else {
  //     res.render("secrets")
  //   }
  // });
  User.register({email:req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log((err));
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login",function(req,res){
  // const username=req.body.username;
  // // const password=md5(req.body.password);
  // User.findOne({email:username},function(err,result){
  //   if(err){
  //     console.log(err);
  //   } else {
  //     if(result){
  //       if(result.password === password){
  //         console.log(result.password+"==="+password);
  //         res.render("secrets");
  //       }
  //     }
  //   }
  // });
  const user = new User({
    email: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.listen(3000,function(){
  console.log("Server started on port 3000");
});
