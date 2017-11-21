const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');

const app = express();

// load routes
const locations = require('./routes/locations');
const events = require('./routes/events');
const users = require('./routes/users');

// passport config
require('./config/passport')(passport);

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://testuser:testuser@ds119685.mlab.com:19685/awayfromlife', { useMongoClient: true })
//mongoose.connect('mongodb://superadmin:shingshongadmin@ds119675.mlab.com:19675/awayfromlife', { useMongoClient: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// passport middleware
app.use(passport.initialize());

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.get('/', (req, res) => {
  res.send('API started');
});

// use routes
app.use('/api/locations', locations);
app.use('/api/events', events);
app.use('/api/users', users);

const port = 3000;

app.listen(port, () => {
  console.log(`Server startet on port ${port}`);
});