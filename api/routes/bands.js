const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const escapeStringRegexp = require('escape-string-regexp');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load genre model
require(dirPath + '/api/models/Genre');
const Genre = mongoose.model('genres');

// load delete.js
const deleteRoute = require(dirPath + '/api/routes/controller/delete');
// load latest.js
const latest = require(dirPath + '/api/routes/controller/latest');
// load pastAndUpcomingEvents.js
const pastAndUpcomingEventsRoute = require(dirPath + '/api/routes/controller/pastAndUpcomingEvents');
// load params.js
const params = require(dirPath + '/api/helpers/params');
// load token.js
const token = require(dirPath + '/api/helpers/token');
// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');
// load validateBand.js
const validateBand = require(dirPath + '/api/helpers/validateBand');
// load csv.js
const csv = require(dirPath + '/api/helpers/csv');
// load multerConfig.js
const multerConfig = require(dirPath + '/api/config/multerConfig');

// bands routes
// get all bands
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const bands = await Band.find();
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all bands including unvalidated bands
router.get('/all', token.checkToken(false), async (req, res) => {
	try {
		const objects = await Band.find();
		const unvalidatedObjects = await UnvalidatedBand.find();
		if (objects.length === 0 && unvalidatedObjects.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		let dereferenced = await dereference.objectArray(objects, 'band', false);
		let dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'band', false);

		dereferenced = dereferenced.map(object => {
			let update = JSON.parse(JSON.stringify(object));
			update.isValidated = true;
			return update;
		});
		dereferencedUnvalidated = dereferencedUnvalidated.map(object => {
			let update = JSON.parse(JSON.stringify(object));
			update.isValidated = false;
			return update;
		});

		let finalList = dereferenced.concat(dereferencedUnvalidated);
		finalList = dereference.bandSort(finalList, 'name', 1);

		return res.status(200).json({ data: finalList, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get paginated bands
router.get('/page', token.checkToken(false), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'genre' || req.query.sortBy === 'origin.city') sortBy = req.query.sortBy;

		let order = 1;
		if (parseInt(req.query.order) === -1) order = -1;

		let query = {};
		if (req.query.startWith && /^[a-z#]$/i.test(req.query.startWith)) {
			if (req.query.startWith === '#') query.name = /^[^a-zäÄöÖüÜ]/i;
			else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = /^[aäÄ]/i;
			else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = /^[oöÖ]/i;
			else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = /^[uüÜ]/i;
			else query.name = new RegExp(`^${escapeStringRegexp(req.query.startWith.trim())}`, 'i');
		}
		if (req.query.city) {
			query.$or = [
				{ 'origin.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'origin.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'origin.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'origin.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'origin.default.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
				{ 'origin.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
			];
		}
		if (req.query.label) query.recordLabel = new RegExp(escapeStringRegexp(req.query.label.trim()), 'i');

		const bands = await Band.find(query);
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', sortBy, order);

		let finalBands = [];
		if (req.query.genre) {
			const genreRegex = new RegExp(`^${escapeStringRegexp(req.query.genre.trim())}$`, 'i');
			dereferenced.forEach(band => {
				band.genre.some(genre => {
					if (genreRegex.test(genre)) {
						finalBands.push(band);
						return true;
					}
					return false;
				});
			});
		}
		else finalBands = dereferenced;

		const count = finalBands.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);
		finalBands = finalBands.slice((perPage * page) - perPage, (perPage * page));

		return res.status(200).json({ data: finalBands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get band by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await Band.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });

		const dereferenced = await dereference.bandObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get band by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await Band.findOne({ url: new RegExp(`^${escapeStringRegexp(req.params.url.trim())}$`, 'i') });
		if (!object)
			return res.status(400).json({ message: 'No band found with this URL', token: res.locals.token });

		const dereferenced = await dereference.bandObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all bands upcoming events
router.get('/:_id/upcomingEvents', token.checkToken(false), async (req, res) => {
	try {
		const events = await pastAndUpcomingEventsRoute.getEvents('upcoming', 'bands', req.params._id);
		if (typeof events == 'string')
			return res.status(200).json({ message: events, token: res.locals.token });
		return res.status(200).json({ data: events, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all bands past events
router.get('/:_id/pastEvents', token.checkToken(false), async (req, res) => {
	try {
		const events = await pastAndUpcomingEventsRoute.getEvents('past', 'bands', req.params._id);
		if (typeof events == 'string')
			return res.status(200).json({ message: events, token: res.locals.token });
		return res.status(200).json({ data: events, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get bands by name
router.get('/name/:name', token.checkToken(false), async (req, res) => {
	try {
		const bands = await Band.find({ name: new RegExp(escapeStringRegexp(req.params.name.trim()), 'i') });
		if (bands.length === 0)
			return res.status(200).json({ message: 'No band found with this name.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(false), async (req, res) => {
	try {
		let regex = new RegExp(`^${escapeStringRegexp(req.params.genre.trim())}$`, 'i');
		const bands = await Band.find();
		if (bands.length === 0)
			return res.status(200).json({ message: 'No band found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		let genreBands = [];
		dereferenced.forEach(band => {
			band.genre.some(genre => {
				if (regex.test(genre)) {
					genreBands.push(band);
					return true;
				}
				return false;
			});
		});
		return res.status(200).json({ data: genreBands, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added bands
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('band', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all genres
router.get('/genres', token.checkToken(false), async (req, res) => {
	try {
		let genreList = [];
		const bands = await Band.find();
		const genres = await Genre.find();

		genres.forEach(genre => {
			bands.some(band => {
				if (band.genre.includes(genre._id.toString())) {
					genreList.push(genre.name);
					return true;
				}
				return false;
			});
		});
		genreList.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: genreList, token: res.locals.token });

	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all labels
router.get('/labels', token.checkToken(false), async (req, res) => {
	try {
		const bands = await Band.find();
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		let labelList = bands.map(band => band.recordLabel);
		const uniqueLabels = new Set(labelList);
		labelList = Array.from(uniqueLabels);
		labelList.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: labelList, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get similar bands
router.get('/similar', token.checkToken(false), async (req, res) => {
	try {
		if (!req.query.name || !req.query.country)
			return res.status(400).json({ message: 'Parameter(s) missing: name and country are required.' });
		let query = {
			name: new RegExp(escapeStringRegexp(req.query.name.trim()), 'i'),
			$or: [
				{ 'origin.default.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
				{ 'origin.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
			]
		};

		const bands = await Band.find(query);
		if (bands.length === 0)
			return res.status(200).json({ message: 'No similar bands found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all filter data
router.get('/filters', token.checkToken(false), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			genres: [],
			labels: [],
			cities: [],
			countries: []
		};
		const bands = await Band.find();
		if (bands.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		dereferenced.forEach(band => {
			if (band.name && !filters.startWith.includes(band.name.charAt(0).toUpperCase())) {
				if (band.name.charAt(0).toUpperCase() === 'Ä') {
					if (!filters.startWith.includes('A')) filters.startWith.push('A');
				}
				else if (band.name.charAt(0).toUpperCase() === 'Ö') {
					if (!filters.startWith.includes('O')) filters.startWith.push('O');
				}
				else if (band.name.charAt(0).toUpperCase() === 'Ü') {
					if (!filters.startWith.includes('U')) filters.startWith.push('U');
				}
				else if (/[A-Z]/.test(band.name.charAt(0).toUpperCase()))
					filters.startWith.push(band.name.charAt(0).toUpperCase());
				else if (!filters.startWith.includes('#'))
					filters.startWith.push('#');
			}
			band.genre.forEach(genre => {
				if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
			});
			if (band.recordLabel && !filters.labels.includes(band.recordLabel))
				filters.labels.push(band.recordLabel);
			if (band.origin.city && !filters.cities.includes(band.origin.city))
				filters.cities.push(band.origin.city);
			if (band.origin.country && !filters.countries.includes(band.origin.country))
				filters.countries.push(band.origin.country);
		});
		filters.startWith.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.genres.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.labels.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.cities.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.countries.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: filters, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post band to database
router.post('/', token.checkToken(true), multerConfig.upload.single('image'), validateBand.validateObject('post'), async (req, res) => {
	try {
		const newBand = await new Band(res.locals.validated).save();
		const dereferenced = await dereference.bandObject(newBand);
		return res.status(200).json({ message: 'Band saved', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple bands to database
router.post('/multiple', token.checkToken(true), multerConfig.upload.single('image'), validateBand.validateList('post'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new Band(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' band(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// convert incoming csv data to matching json
router.post('/convertCSV', token.checkToken(false), multerConfig.uploadCSV.single('file'), async (req, res) => {
	try {
		const bands = await csv.convertFile(req.file, 'bands');
		return res.status(200).json({ data: bands, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

router.get('/update/Tmp/Genre', async (req, res) => {
	try {
		console.log('start');
		const jsonFile = [
			{
			  "_id": "5adc666a2beb9202f15dde55",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad994322beb9202f15ddd6f",
			  "genre": "Post Punk"
			},
			{
			  "_id": "5ae1826528c2a6710464c57d",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad994352beb9202f15ddd71",
			  "genre": "Indie Punk"
			},
			{
			  "_id": "5ad994362beb9202f15ddd72",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ae1826528c2a6710464c57e",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ad994382beb9202f15ddd73",
			  "genre": "Post Hardcore"
			},
			{
			  "_id": "5adc66412beb9202f15dde53",
			  "genre": "Melodic Punk"
			},
			{
			  "_id": "5adc667e2beb9202f15dde56",
			  "genre": "Melodic Punk"
			},
			{
			  "_id": "5adc669d2beb9202f15dde58",
			  "genre": "Skate Punk"
			},
			{
			  "_id": "5adcc5b72beb9202f15dde73",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8ece02beb9202f15ddcb7",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8f27f2beb9202f15ddccb",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5adf446228c2a6710464c52d",
			  "genre": "Horror Punk"
			},
			{
			  "_id": "5adcc5c12beb9202f15dde75",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ae972f528c2a6710464c5fa",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5adf44cb28c2a6710464c531",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8cdf7d4491577b8e6b9cc",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5af5f84428c2a6710464c68e",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad994392beb9202f15ddd74",
			  "genre": "Straight Edge"
			},
			{
			  "_id": "5ad8ec772beb9202f15ddcb3",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5adf8a8828c2a6710464c542",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5adf8a8a28c2a6710464c543",
			  "genre": "Horror Punk"
			},
			{
			  "_id": "5b44c17ff1d2541b9e1a59f9",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ae1826628c2a6710464c57f",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ae1826828c2a6710464c580",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad994552beb9202f15ddd77",
			  "genre": "Post Hardcore"
			},
			{
			  "_id": "5ae1826828c2a6710464c581",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad994442beb9202f15ddd76",
			  "genre": "Post Hardcore"
			},
			{
			  "_id": "5ae1826b28c2a6710464c585",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ae1826b28c2a6710464c586",
			  "genre": "Reggae Punk"
			},
			{
			  "_id": "5adf451428c2a6710464c537",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada44a72beb9202f15dde01",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad994582beb9202f15ddd79",
			  "genre": "Straight Edge"
			},
			{
			  "_id": "5addb7c52beb9202f15ddebd",
			  "genre": "UK82"
			},
			{
			  "_id": "5adf44f328c2a6710464c535",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ae2b63528c2a6710464c5a3",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5afb2c2128c2a6710464c6ce",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5addb6922beb9202f15ddeaf",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ae1826d28c2a6710464c588",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5ae2e4f328c2a6710464c5c3",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5af5f4ae28c2a6710464c662",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5af5f57028c2a6710464c66c",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5af5f63c28c2a6710464c676",
			  "genre": "Crossover"
			},
			{
			  "_id": "5af5f61c28c2a6710464c674",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ae4d9d028c2a6710464c5e8",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ada3f8d2beb9202f15dddcf",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5adf44b628c2a6710464c52f",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5af5f6af28c2a6710464c67a",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5af5f6e928c2a6710464c67e",
			  "genre": "Crossover"
			},
			{
			  "_id": "5af0a29928c2a6710464c61c",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5af139a128c2a6710464c62b",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5adefb2c28c2a6710464c514",
			  "genre": "Psychobilly"
			},
			{
			  "_id": "5ad9950e2beb9202f15ddd7c",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5af2f1eb28c2a6710464c63e",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ae9735f28c2a6710464c5fe",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5addb7e52beb9202f15ddebf",
			  "genre": "UK82"
			},
			{
			  "_id": "5ad8fdc32beb9202f15ddd03",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ad9950f2beb9202f15ddd7d",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5b44c180f1d2541b9e1a5a00",
			  "genre": "Beatdown"
			},
			{
			  "_id": "5ae9738c28c2a6710464c600",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ad8eb162beb9202f15ddca7",
			  "genre": "Folk Punk"
			},
			{
			  "_id": "5af2f16528c2a6710464c635",
			  "genre": "Hip Hop"
			},
			{
			  "_id": "5ad8f22e2beb9202f15ddcc7",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5adefb2c28c2a6710464c517",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5b44c181f1d2541b9e1a5a03",
			  "genre": "Folk Punk"
			},
			{
			  "_id": "5ad8eb0f2beb9202f15ddca5",
			  "genre": "Folk Punk"
			},
			{
			  "_id": "5ada41862beb9202f15ddddf",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5af5f7fa28c2a6710464c68a",
			  "genre": "Punk"
			},
			{
			  "_id": "5af5f82228c2a6710464c68c",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5addb8042beb9202f15ddec1",
			  "genre": "UK82"
			},
			{
			  "_id": "5ad995102beb9202f15ddd80",
			  "genre": "Melodic Punk"
			},
			{
			  "_id": "5ad8ecb12beb9202f15ddcb5",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5ada452f2beb9202f15dde07",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ada44442beb9202f15dddfd",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5afb2c2428c2a6710464c6d2",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad8f4882beb9202f15ddcdb",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad995112beb9202f15ddd82",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5af5dfc828c2a6710464c65b",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5ad995122beb9202f15ddd83",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5afb2c2528c2a6710464c6d3",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5adcc5d12beb9202f15dde78",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5afb2c2628c2a6710464c6d4",
			  "genre": "Post Hardcore"
			},
			{
			  "_id": "5b44c182f1d2541b9e1a5a09",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad9b2372beb9202f15dddb5",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5afb2c2928c2a6710464c6d8",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ae1827028c2a6710464c58e",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5adcc5af2beb9202f15dde72",
			  "genre": "Post Punk"
			},
			{
			  "_id": "5afb2c2a28c2a6710464c6d9",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ada42b52beb9202f15ddded",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad8fdc52beb9202f15ddd04",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5af1377228c2a6710464c624",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5ad995132beb9202f15ddd85",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ad8e5f72beb9202f15ddc87",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ada3fe22beb9202f15dddd3",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad995142beb9202f15ddd86",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5addb6952beb9202f15ddeb4",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ad8fdca2beb9202f15ddd06",
			  "genre": "Ska Punk"
			},
			{
			  "_id": "5ad995142beb9202f15ddd87",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5addb6962beb9202f15ddeb5",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5addb6962beb9202f15ddeb6",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ada3fc12beb9202f15dddd1",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5af5f87b28c2a6710464c690",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad995152beb9202f15ddd88",
			  "genre": "Skate Punk"
			},
			{
			  "_id": "5ad8f37f2beb9202f15ddcd3",
			  "genre": "Skate Punk"
			},
			{
			  "_id": "5ad995152beb9202f15ddd89",
			  "genre": "Skate Punk"
			},
			{
			  "_id": "5ad8eb182beb9202f15ddca8",
			  "genre": "Skate Punk"
			},
			{
			  "_id": "5ae1827228c2a6710464c592",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8eb192beb9202f15ddca9",
			  "genre": "Ska Punk"
			},
			{
			  "_id": "5ad995162beb9202f15ddd8a",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ad995172beb9202f15ddd8b",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ae4d99e28c2a6710464c5e6",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad995182beb9202f15ddd8c",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad9951d2beb9202f15ddd8e",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ad9951c2beb9202f15ddd8d",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ae2e4f828c2a6710464c5cb",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad8eb1a2beb9202f15ddcaa",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5ad995262beb9202f15ddd91",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8e5e92beb9202f15ddc85",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ae2e4f828c2a6710464c5cc",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5addbaee2beb9202f15ddecf",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ad995272beb9202f15ddd92",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5b44c185f1d2541b9e1a5a15",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad995272beb9202f15ddd93",
			  "genre": "Pop Punk"
			},
			{
			  "_id": "5b44c185f1d2541b9e1a5a16",
			  "genre": "Crossover"
			},
			{
			  "_id": "5b44c186f1d2541b9e1a5a17",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5af5f66a28c2a6710464c678",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ada44842beb9202f15dddff",
			  "genre": "Straight Edge"
			},
			{
			  "_id": "5ad995282beb9202f15ddd94",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad8fdcc2beb9202f15ddd07",
			  "genre": "Melodic Punk"
			},
			{
			  "_id": "5adcc5a72beb9202f15dde71",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada47a52beb9202f15dde1b",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad8e5402beb9202f15ddc7d",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad8fdce2beb9202f15ddd08",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad8f2b22beb9202f15ddccd",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad9952b2beb9202f15ddd98",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad8eb1d2beb9202f15ddcac",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad9952b2beb9202f15ddd99",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada42f72beb9202f15dddf1",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ada43cc2beb9202f15dddf9",
			  "genre": "Horror Punk"
			},
			{
			  "_id": "5ad9952c2beb9202f15ddd9a",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5b44c186f1d2541b9e1a5a1a",
			  "genre": "Streetpunk"
			},
			{
			  "_id": "5addb6982beb9202f15ddeb9",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ae1827428c2a6710464c595",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad9b2382beb9202f15dddb6",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5ad8f3d52beb9202f15ddcd7",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5b44c187f1d2541b9e1a5a1c",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ad9b2382beb9202f15dddb7",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ae2e4fa28c2a6710464c5cf",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad9b2392beb9202f15dddb8",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad9b23a2beb9202f15dddba",
			  "genre": "Crossover"
			},
			{
			  "_id": "5ad8f2d62beb9202f15ddccf",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5adf44dd28c2a6710464c533",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad9b23b2beb9202f15dddbb",
			  "genre": "Punk'n'Roll"
			},
			{
			  "_id": "5ad9b23b2beb9202f15dddbc",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8fdd02beb9202f15ddd09",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad8eb1e2beb9202f15ddcae",
			  "genre": "UK82"
			},
			{
			  "_id": "5ada46402beb9202f15dde0f",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ad9b23b2beb9202f15dddbd",
			  "genre": "Melodic Hardcore"
			},
			{
			  "_id": "5ad9b23c2beb9202f15dddbe",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada415e2beb9202f15ddddd",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8f44d2beb9202f15ddcd9",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad9b23c2beb9202f15dddbf",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8e1c42beb9202f15ddc7a",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5b44c189f1d2541b9e1a5a1f",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8ec092beb9202f15ddcaf",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada3f4b2beb9202f15dddcd",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ae6e30928c2a6710464c5ea",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5af5dfd528c2a6710464c65f",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad8efe82beb9202f15ddcbf",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ad9b23c2beb9202f15dddc1",
			  "genre": "Punk Rock"
			},
			{
			  "_id": "5ada41112beb9202f15ddddb",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ada41b42beb9202f15ddde1",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ae4d99f28c2a6710464c5e7",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5b44c189f1d2541b9e1a5a20",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ada425e2beb9202f15ddde9",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ae1827528c2a6710464c598",
			  "genre": "Metal Hardcore"
			},
			{
			  "_id": "5ada42302beb9202f15ddde7",
			  "genre": "Hardcore"
			},
			{
			  "_id": "5ad8ee312beb9202f15ddcb9",
			  "genre": "Hardcore Punk"
			},
			{
			  "_id": "5ae973bb28c2a6710464c602",
			  "genre": "Deutschpunk"
			},
			{
			  "_id": "5ada3f4c2beb9202f15dddce",
			  "genre": "Straight Edge"
			}
		  ];
		console.log('after json', jsonFile);
		const promises = jsonFile.map(async jsonObject => {
			try {
				console.log('begin map');
				let band = await Band.findById(jsonObject._id);
				console.log('after band find', band);
				if (!band) {
					return 'Band not found.';
				}
				let genre = await Genre.findOne({ name: jsonObject.genre });
				console.log('after genre find', genre);
				if (!genre) {
					return 'Genre not found.';
				}
				band.genre = [genre._id];
				console.log('updated band', band);
				const updated = await Band.findOneAndUpdate({ _id: jsonObject._id }, band, { new: true });
				console.log('after update', updated);
				const dereferenced = await dereference.bandObject(updated);
				console.log('after dereference', dereferenced);
				return dereferenced;
			}
			catch (err) {
				return err;
			}
		});
		const response = await Promise.all(promises);
		return res.status(200).json({ data: response });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update band by id
router.put('/:_id', token.checkToken(true), multerConfig.upload.single('image'), validateBand.validateObject('put'), async (req, res) => {
	try {
		const updated = await Band.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.bandObject(updated);
		return res.status(200).json({ message: 'Band updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.deleteObject(req.params._id, 'band');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;