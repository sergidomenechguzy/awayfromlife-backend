const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();

global.dirPath = __dirname;

// load routes
const general = require(dirPath + '/api/routes/general');

const events = require(dirPath + '/api/routes/events');
const unvalidated_events = require(dirPath + '/api/routes/unvalidated_events');
const archived_events = require(dirPath + '/api/routes/archived_events');

const festivals = require(dirPath + '/api/routes/festivals');
const unvalidated_festivals = require(dirPath + '/api/routes/unvalidated_festivals');
const festival_events = require(dirPath + '/api/routes/festival_events');
const unvalidated_festival_events = require(dirPath + '/api/routes/unvalidated_festival_events');

const locations = require(dirPath + '/api/routes/locations');
const unvalidated_locations = require(dirPath + '/api/routes/unvalidated_locations');

const bands = require(dirPath + '/api/routes/bands');
const unvalidated_bands = require(dirPath + '/api/routes/unvalidated_bands');

const genres = require(dirPath + '/api/routes/genres');

const search = require(dirPath + '/api/routes/search');

const bugs = require(dirPath + '/api/routes/bugs');
const feedback = require(dirPath + '/api/routes/feedback');
const reports = require(dirPath + '/api/routes/reports');

const users = require(dirPath + '/api/routes/users');

// load secrets.js
const secrets = require(dirPath + '/api/config/secrets');
// load archive.js
const archive = require(dirPath + '/api/routes/controller/archive');

// connect to mongoose
mongoose.Promise = global.Promise;
mongoose.connect(secrets.dbURL, { useMongoClient: true })
	.then(() => console.log('> MongoDB connected'))
	.catch(err => console.log(err));

// make images folder publicly available
app.use('/images', express.static('images'));

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// morgan logger setup
app.use(morgan('combined', {
	stream: fs.createWriteStream(path.join(__dirname, '/api/logs/access.log'), {flags: 'a'})
}));
app.use(morgan('combined', {
	skip: (req, res) => { return res.statusCode < 400 },
	stream: fs.createWriteStream(path.join(__dirname, '/api/logs/error.log'), {flags: 'a'})
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
app.use('/api/general', general);

app.use('/api/events', events);
app.use('/api/unvalidated-events', unvalidated_events);
app.use('/api/archived-events', archived_events);

app.use('/api/festivals', festivals);
app.use('/api/unvalidated-festivals', unvalidated_festivals);
app.use('/api/festival-events', festival_events);
app.use('/api/unvalidated-festival-events', unvalidated_festival_events);

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
	setInterval(async () => {
		try {
			await archive.events();
		}
		catch (err) {
			console.log(err);
		}
	}, 86400000);
}
