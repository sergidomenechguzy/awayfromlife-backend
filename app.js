const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();

// load routes
const events = require('./routes/events');
const unvalidated_events = require('./routes/unvalidated_events');
const archived_events = require('./routes/archived_events');

const locations = require('./routes/locations');
const unvalidated_locations = require('./routes/unvalidated_locations');

const bands = require('./routes/bands');
const unvalidated_bands = require('./routes/unvalidated_bands');

const genres = require('./routes/genres');

const search = require('./routes/search');

const bugs = require('./routes/bugs');
const feedback = require('./routes/feedback');
const reports = require('./routes/reports');

const users = require('./routes/users');

// load secrets
const secrets = require('./config/secrets');
// load archive.js
const archive = require('./config/archive');

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose.connect(secrets.dbURL, { useMongoClient: true })
	.then(() => console.log('> MongoDB connected'))
	.catch(err => console.log(err));

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// morgan logger setup
app.use(morgan('combined', {
	stream: fs.createWriteStream(path.join(__dirname, '/logs/access.log'), {flags: 'a'})
}));
app.use(morgan('combined', {
	skip: (req, res) => { return res.statusCode < 400 },
	stream: fs.createWriteStream(path.join(__dirname, '/logs/error.log'), {flags: 'a'})
}));

app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, DELETE');
	next();
});

// root route
app.get('/', (req, res) => {
	res.send('Backend Service for the Awayfromlife Event Application.');
});

// use routes
app.use('/api/events', events);
app.use('/api/unvalidated-events', unvalidated_events);
app.use('/api/archived-events', archived_events);

app.use('/api/locations', locations);
app.use('/api/unvalidated-locations', unvalidated_locations);

app.use('/api/bands', bands);
app.use('/api/unvalidated-bands', unvalidated_bands);

app.use('/api/genres', genres);

app.use('/api/search', search);

app.use('/api/bugs', bugs);
app.use('/api/feedback', feedback);
app.use('/api/reports', reports);

app.use('/api/users', users);

const port = secrets.port;

app.listen(port, () => {
	console.log(`> Server startet on port ${port}`);
});

if (process.env.NODE_ENV === 'production') {
	setInterval(() => archive.events((err, response) => {
		if (err) console.log(err.name + ': ' + err.message);
	}), 86400000);
}

const update = require('./config/update');
// update.updateEvents();
// update.updateArchivedEvents();
// update.updateLocations();
// update.updateBands();
update.updateGenres();