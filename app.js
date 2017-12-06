const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');

const app = express();

// load routes
const locations = require('./routes/locations');
const events = require('./routes/events');
const unvalidated_locations = require('./routes/unvalidated_locations');
const unvalidated_events = require('./routes/unvalidated_events');
const users = require('./routes/users');

// passport config
require('./config/passport')(passport);

//load secrets
const secrets = require('./secrets.js');

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose.connect(secrets.dbURL, { useMongoClient:true})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// passport middleware
app.use(passport.initialize());

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, DELETE");
  next();
});

app.get('/', (req, res) => {
  const date1 = Date.now();
  const date2 = Date.now() + 10000;
  res.send('API started ' + date1 + ', ' + date2);
});

// use routes
app.use('/api/locations', locations);
app.use('/api/events', events);
app.use('/api/unvalidated-locations', unvalidated_locations);
app.use('/api/unvalidated-events', unvalidated_events);
app.use('/api/users', users);

const port = secrets.port;

app.listen(port, () => {
  console.log(`Server startet on port ${port}`);
});
