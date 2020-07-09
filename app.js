var createError = require('http-errors');
const helmet = require('helmet')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const cors = require('cors');
var CronJob = require('cron').CronJob;
var { checkIn } = require('./cronHelpers');
var session = require('express-session');

var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

const MongoClient = require('mongodb').MongoClient;
const uri = process.env.DBSTRING;
const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

var twilioRouter = require('./routes/twilio');
var indexRouter = require('./routes/index');
var mongoRouter = require('./routes/mongo');
require('dotenv').config();

var app = express();
app.use(helmet());
// perform actions on the collection object
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/ingest')));

var sess = {
  secret: 'rgoihawr;ohqwerfo;ih',
  cookie: {},
  resave: false,
  saveUninitialized: false
};

if (process.env.ENV === 'production') {
  // Use secure cookies in production (requires SSL/TLS)
  sess.cookie.secure = true;
  app.set('trust proxy', 1);
}
app.use(session(sess));

var strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

let corsRegexString = process.env.CORS_REGEX || 'localhost';

// CRON EXPRESSIONS
const cron9am = process.env.MORNING_CRON || '0 0 9 * * *'
const cron6pm = process.env.EVENING_CRON || '0 0 18 * * *'

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsRegexString)
  next();
})

let corsRegex = new RegExp(`.*${corsRegexString}.*`);

let corsOptions = {
  origin: corsRegex,
  credentials: true,
}
app.use(cors(corsOptions));

async function main() {
  try {
    await dbClient.connect();

    if (process.env.ACTIVATE_CRON) {
      var job9am = new CronJob(cron9am, async () => {
        await checkIn(dbClient, '6pm tonight', 'morning');
      }, null, true, 'America/New_York');

      var job6pm = new CronJob(cron6pm, async () => {
        await checkIn(dbClient, '9am tomorrow morning', 'evening');
      }, null, true, 'America/New_York');

      job9am.start();
      job6pm.start();
    }

    app.use('/', (req, res, next) => {
      req.client = dbClient;
      next();
    },
    indexRouter);

    app.use('/mongo/', (req, res, next) => {
      req.client = dbClient;
      next();
    },
    mongoRouter);

    app.use('/twilio/', (req, res, next) => {
      req.client = dbClient;
      next();
    }, twilioRouter);

    app.use('/recording.mp3/', (req, res) => {
      res.sendFile('./sound_files/blkstomp.mp3', {root: __dirname})
    })

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      next(createError(404));
    });

    // error handler
    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.json({error : err});
    });
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.err);


module.exports = app;
