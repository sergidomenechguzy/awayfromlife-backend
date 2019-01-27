const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');

// load event model
require(dirPath + '/api/models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');

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
		if (req.query.startWith && /^[a-zA-Z#]$/.test(req.query.startWith)) {
			if (req.query.startWith === '#') query.name = new RegExp('^[^a-zäÄöÖüÜ]', 'i');
			else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = new RegExp('^[' + req.query.startWith + 'äÄ]', 'i');
			else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = new RegExp('^[' + req.query.startWith + 'öÖ]', 'i');
			else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = new RegExp('^[' + req.query.startWith + 'üÜ]', 'i');
			else query.name = new RegExp('^' + req.query.startWith, 'i');
		}
		if (req.query.city) {
			query.$or = [
				{ 'origin.default.city': new RegExp(req.query.city, 'i') },
				{ 'origin.default.administrative': new RegExp(req.query.city, 'i') },
				{ 'origin.default.county': new RegExp(req.query.city, 'i') },
				{ 'origin.international.city': new RegExp(req.query.city, 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'origin.default.country': RegExp(req.query.country, 'i') },
				{ 'origin.international.country': new RegExp(req.query.country, 'i') }
			];
		}
		if (req.query.label) query.recordLabel = RegExp(req.query.label, 'i');

		const bands = await Band.find(query);
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', sortBy, order);

		let finalBands = [];
		if (req.query.genre) {
			const genreRegex = RegExp('^' + req.query.genre + '$', 'i');
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
		const object = await Band.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') });
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
		const bands = await Band.find({ name: new RegExp(req.params.name, 'i') });
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
		let regex = new RegExp('^' + req.params.genre + '$', 'i');
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
			name: new RegExp('^' + req.query.name + '$', 'i'),
			$or: [
				{ 'address.default.country': new RegExp('^' + req.query.country + '$', 'i') },
				{ 'address.international.country': new RegExp('^' + req.query.country + '$', 'i') }
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
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateList('post'), async (req, res) => {
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






const image = require(dirPath + '/api/helpers/image');

router.get('/updatePlaceholder', async (req, res) => {
	try {
		const bands = await Band.find();
		const promises = bands.map(async (band) => {
			if (band.image.length != 3) {
				band.image = image.randomPlaceholder();
				const updated = await Band.findOneAndUpdate({ _id: band._id }, band, { new: true });
				return { message: 'image updated with placeholder', data: updated };
			}
			return { message: 'no update needed', data: event };
		});
		const bandList = await Promise.all(promises);

		const unbands = await UnvalidatedBand.find();
		const unpromises = unbands.map(async (band) => {
			if (band.image.length != 3) {
				band.image = image.randomPlaceholder();
				const updated = await UnvalidatedBand.findOneAndUpdate({ _id: band._id }, band, { new: true });
				return { message: 'image updated with placeholder', data: updated };
			}
			return { message: 'no update needed', data: event };
		});
		const unbandList = await Promise.all(unpromises);

		return res.status(200).json({ bands: bandList, unvalidatedBands: unbandList });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

router.get('/testImage', async (req, res) => {
	try {
		const events = await Band.find();
		const eventList = events.filter(event => {
			if (!Array.isArray(event.image) || event.image.length <= 1) return true;
			return false;
		});
		const unevents = await UnvalidatedBand.find();
		const uneventList = unevents.filter(event => {
			if (!Array.isArray(event.image) || event.image.length <= 1) return true;
			return false;
		});
		return res.status(200).json({ events: eventList, unvalidatedEvents: uneventList });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;