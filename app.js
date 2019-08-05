const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const secrets = require('./api/config/secrets');

const app = express();
global.dirPath = __dirname;

// load routes
const general = require('./api/routes/general');
const events = require('./api/routes/events');
const unvalidatedEvents = require('./api/routes/unvalidatedEvents');
const festivals = require('./api/routes/festivals');
const unvalidatedFestivals = require('./api/routes/unvalidatedFestivals');
const festivalEvents = require('./api/routes/festivalEvents');
const unvalidatedFestivalEvents = require('./api/routes/unvalidatedFestivalEvents');
const locations = require('./api/routes/locations');
const unvalidatedLocations = require('./api/routes/unvalidatedLocations');
const bands = require('./api/routes/bands');
const unvalidatedBands = require('./api/routes/unvalidatedBands');
const genres = require('./api/routes/genres');
const search = require('./api/routes/search');
const bugs = require('./api/routes/bugs');
const feedback = require('./api/routes/feedback');
const reports = require('./api/routes/reports');
const users = require('./api/routes/users');

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose
  .connect(secrets.dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('> MongoDB connected'))
  .catch(err => console.error(err));

// make images folder publicly available
app.use('/images', express.static('images'));

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// morgan logger setup
app.use(
  morgan('combined', {
    stream: fs.createWriteStream(path.join(__dirname, '/api/logs/access.log'), { flags: 'a' }),
  })
);
app.use(
  morgan('combined', {
    skip: (req, res) => {
      return res.statusCode < 400;
    },
    stream: fs.createWriteStream(path.join(__dirname, '/api/logs/error.log'), { flags: 'a' }),
  })
);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, DELETE'
  );
  next();
});

// root route
app.get('/', (req, res) => {
  res.send('Backend Service for the Awayfromlife Event Application.');
});

// use routes
app.use('/api/general', general);

app.use('/api/events', events);
app.use('/api/unvalidated-events', unvalidatedEvents);

app.use('/api/festivals', festivals);
app.use('/api/unvalidated-festivals', unvalidatedFestivals);
app.use('/api/festival-events', festivalEvents);
app.use('/api/unvalidated-festival-events', unvalidatedFestivalEvents);

app.use('/api/locations', locations);
app.use('/api/unvalidated-locations', unvalidatedLocations);

app.use('/api/bands', bands);
app.use('/api/unvalidated-bands', unvalidatedBands);

app.use('/api/genres', genres);

app.use('/api/search', search);

app.use('/api/bugs', bugs);
app.use('/api/feedback', feedback);
app.use('/api/reports', reports);

app.use('/api/users', users);

const { port, ip } = secrets;

app.listen(port, ip, () => {
  console.log(`> Server startet on ${ip}:${port}`);
});

app.use((req, res) => {
  res.status(404).json({ error: '404 - Not found' });
});
