const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateBand.js
const validateBand = require('../helpers/validateBand');

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

		const dereferenced = await dereference.objectArray(objects, 'band', 'name', 1);
		const dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'band', 'name', 1);
		const allObjects = {
			validated: dereferenced,
			unvalidated: dereferencedUnvalidated
		};
		return res.status(200).json({ data: allObjects, token: res.locals.token });
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

// get all bands events
router.get('/events/:_id', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find({ bands: req.params._id });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found for this band.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
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
router.post('/', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('post'), async (req, res) => {
	try {
		await new Band(res.locals.validated).save();
		return res.status(200).json({ message: 'Band saved', token: res.locals.token });
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
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('put'), async (req, res) => {
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
		const response = await deleteRoute.delete(req.params._id, 'validBand');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});








//###
const algoliasearch = require('algoliasearch');
const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');
// load event model
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const ArchivedEvent = mongoose.model('archived_events');

// load band model
require('../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load band model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

router.get('/updateAddress', async (req, res) => {
	try {
		const bands = await Band.find();
		const promises1 = bands.map(async (band) => {
			let res = await places.search({ query: band.origin.value ? band.origin.value : `${band.origin.city}, ${band.origin.country}`, language: 'en', type: 'city' });
			let newBand = JSON.parse(JSON.stringify(band));
			newBand.origin.city = res.hits[0].locale_names[0];

			switch (band.origin.country) {
				case 'Australien':
					newBand.origin.countryCode = 'au';
					newBand.origin.country = 'Australia';
					break;
			
				case 'België - Belgique - Belgien':
				case 'Belgien':
					newBand.origin.countryCode = 'be';
					newBand.origin.country = 'Belgium';
					break;
			
				case 'Brasilien':
				case 'Brazil':
					newBand.origin.countryCode = 'br';
					newBand.origin.country = 'Brazil';
					break;
			
				case 'Česko':
				case 'Tschechien':
					newBand.origin.countryCode = 'cz';
					newBand.origin.country = 'Czech Republic';
					break;
			
				case 'Danmark':
				case 'Denmark':
					newBand.origin.countryCode = 'dk';
					newBand.origin.country = 'Denmark';
					break;
			
				case 'Deutschland':
				case 'Germany':
					newBand.origin.countryCode = 'de';
					newBand.origin.country = 'Germany';
					break;
			
				case 'Finnland':
					newBand.origin.countryCode = 'fi';
					newBand.origin.country = 'Finland';
					break;
			
				case 'France':
				case 'Frankreich':
					newBand.origin.countryCode = 'fr';
					newBand.origin.country = 'France';
					break;
			
				case 'Israel':
					newBand.origin.countryCode = 'il';
					newBand.origin.country = 'Israel';
					break;
			
				case 'Italien':
				case 'Italy':
					newBand.origin.countryCode = 'it';
					newBand.origin.country = 'Italy';
					break;
			
				case 'Japan':
					newBand.origin.countryCode = 'jp';
					newBand.origin.country = 'Japan';
					break;
			
				case 'Kanada':
					newBand.origin.countryCode = 'ca';
					newBand.origin.country = 'Canada';
					break;
			
				case 'Kroatien':
					newBand.origin.countryCode = 'hr';
					newBand.origin.country = 'Croatia';
					break;
			
				case 'Mexiko':
					newBand.origin.countryCode = 'mx';
					newBand.origin.country = 'Mexico';
					break;
			
				case 'Neuseeland':
					newBand.origin.countryCode = 'nz';
					newBand.origin.country = 'New Zealand';
					break;
			
				case 'Nigeria':
					newBand.origin.countryCode = 'ng';
					newBand.origin.country = 'Nigeria';
					break;
			
				case 'Magyarország':
				case 'Ungarn':
					newBand.origin.countryCode = 'hu';
					newBand.origin.country = 'Hungary';
					break;
			
				case 'Niederlande':
				case 'The Netherlands':
					newBand.origin.countryCode = 'nl';
					newBand.origin.country = 'The Netherlands';
					break;
			
				case 'Norwegen':
					newBand.origin.countryCode = 'no';
					newBand.origin.country = 'Norway';
					break;
			
				case 'Russland':
				case 'Russia':
					newBand.origin.countryCode = 'ru';
					newBand.origin.country = 'Russia';
					break;
			
				case 'Österreich':
				case 'Austria':
					newBand.origin.countryCode = 'at';
					newBand.origin.country = 'Austria';
					break;
			
				case 'Polen':
					newBand.origin.countryCode = 'pl';
					newBand.origin.country = 'Poland';
					break;
			
				case 'Peru':
					newBand.origin.countryCode = 'pe';
					newBand.origin.country = 'Peru';
					break;
			
				case 'Schweiz':
					newBand.origin.countryCode = 'ch';
					newBand.origin.country = 'Switzerland';
					break;
			
				case 'Spanien':
					newBand.origin.countryCode = 'es';
					newBand.origin.country = 'Spain';
					break;
			
				case 'Südafrika':
					newBand.origin.countryCode = 'za';
					newBand.origin.country = 'South Africa';
					break;
			
				case 'Sverige':
				case 'Schweden':
				case 'Sweden':
					newBand.origin.countryCode = 'se';
					newBand.origin.country = 'Sweden';
					break;
			
				case 'United Kingdom':
				case 'Vereinigtes Königreich':
					newBand.origin.countryCode = 'gb';
					newBand.origin.country = 'United Kingdom';
					break;
			
				case 'Vereinigte Staaten von Amerika':
				case 'United States of America':
					newBand.origin.countryCode = 'us';
					newBand.origin.country = 'United States of America';
					break;
				default:
					newBand.origin.countryCode = 'en';
			}

			const update = await validateBand.validateBand(newBand, 'put', { id: band._id });
			const updated = await Band.findOneAndUpdate({ _id: band._id }, update, { new: true });
			return updated;
		});
		const bandList = await Promise.all(promises1);

		const locations = await Location.find();
		const promises2 = locations.map(async (location) => {
			let newLocation = JSON.parse(JSON.stringify(location));

			switch (location.address.country) {
				case 'Australien':
					newLocation.address.countryCode = 'au';
					newLocation.address.country = 'Australia';
					break;
				
				case 'België - Belgique - Belgien':
				case 'Belgien':
					newLocation.address.countryCode = 'be';
					newLocation.address.country = 'Belgium';
					break;
				
				case 'Brasilien':
				case 'Brazil':
					newLocation.address.countryCode = 'br';
					newLocation.address.country = 'Brazil';
					break;
			
				case 'Česko':
				case 'Tschechien':
					newLocation.address.countryCode = 'cz';
					newLocation.address.country = 'Czech Republic';
					break;
			
				case 'Danmark':
				case 'Denmark':
					newLocation.address.countryCode = 'dk';
					newLocation.address.country = 'Denmark';
					break;
			
				case 'Deutschland':
				case 'Germany':
					newLocation.address.countryCode = 'de';
					newLocation.address.country = 'Germany';
					break;
				
				case 'Finnland':
					newLocation.address.countryCode = 'fi';
					newLocation.address.country = 'Finland';
					break;
			
				case 'France':
				case 'Frankreich':
					newLocation.address.countryCode = 'fr';
					newLocation.address.country = 'France';
					break;
				
				case 'Israel':
					newLocation.address.countryCode = 'il';
					newLocation.address.country = 'Israel';
					break;
			
				case 'Italien':
				case 'Italy':
					newLocation.address.countryCode = 'it';
					newLocation.address.country = 'Italy';
					break;
			
				case 'Japan':
					newLocation.address.countryCode = 'jp';
					newLocation.address.country = 'Japan';
					break;
			
				case 'Kanada':
					newLocation.address.countryCode = 'ca';
					newLocation.address.country = 'Canada';
					break;
			
				case 'Kroatien':
					newLocation.address.countryCode = 'hr';
					newLocation.address.country = 'Croatia';
					break;
			
				case 'Mexiko':
					newLocation.address.countryCode = 'mx';
					newLocation.address.country = 'Mexico';
					break;
			
				case 'Neuseeland':
					newLocation.address.countryCode = 'nz';
					newLocation.address.country = 'New Zealand';
					break;
			
				case 'Nigeria':
					newLocation.address.countryCode = 'ng';
					newLocation.address.country = 'Nigeria';
					break;
			
				case 'Magyarország':
				case 'Ungarn':
					newLocation.address.countryCode = 'hu';
					newLocation.address.country = 'Hungary';
					break;
			
				case 'Niederlande':
				case 'The Netherlands':
					newLocation.address.countryCode = 'nl';
					newLocation.address.country = 'The Netherlands';
					break;
			
				case 'Norwegen':
					newLocation.address.countryCode = 'no';
					newLocation.address.country = 'Norway';
					break;
			
				case 'Russland':
				case 'Russia':
					newLocation.address.countryCode = 'ru';
					newLocation.address.country = 'Russia';
					break;
			
				case 'Österreich':
				case 'Austria':
					newLocation.address.countryCode = 'at';
					newLocation.address.country = 'Austria';
					break;
			
				case 'Polen':
					newLocation.address.countryCode = 'pl';
					newLocation.address.country = 'Poland';
					break;
			
				case 'Peru':
					newLocation.address.countryCode = 'pe';
					newLocation.address.country = 'Peru';
					break;
			
				case 'Schweiz':
					newLocation.address.countryCode = 'ch';
					newLocation.address.country = 'Switzerland';
					break;
			
				case 'Spanien':
					newLocation.address.countryCode = 'es';
					newLocation.address.country = 'Spain';
					break;
			
				case 'Südafrika':
					newLocation.address.countryCode = 'za';
					newLocation.address.country = 'South Africa';
					break;
			
				case 'Sverige':
				case 'Schweden':
				case 'Sweden':
					newLocation.address.countryCode = 'se';
					newLocation.address.country = 'Sweden';
					break;
					
				case 'United Kingdom':
				case 'Vereinigtes Königreich':
					newLocation.address.countryCode = 'gb';
					newLocation.address.country = 'United Kingdom';
					break;
				
				case 'Vereinigte Staaten von Amerika':
				case 'United States of America':
					newLocation.address.countryCode = 'us';
					newLocation.address.country = 'United States of America';
					break;
				default:
					newLocation.address.countryCode = 'en';
			}

			const update = await validateLocation.validateLocation(newLocation, 'put', { id: location._id });
			const updated = await Location.findOneAndUpdate({ _id: location._id }, update, { new: true });
			return updated;
		});
		const locationList = await Promise.all(promises2);

		const festivals = await Festival.find();
		const promises3 = festivals.map(async (festival) => {
			let newFestival = JSON.parse(JSON.stringify(festival));

			switch (festival.address.country) {
				case 'Australien':
					newFestival.address.countryCode = 'au';
					newFestival.address.country = 'Australia';
					break;
				
				case 'België - Belgique - Belgien':
				case 'Belgien':
					newFestival.address.countryCode = 'be';
					newFestival.address.country = 'Belgium';
					break;
				
				case 'Brasilien':
				case 'Brazil':
					newFestival.address.countryCode = 'br';
					newFestival.address.country = 'Brazil';
					break;
			
				case 'Česko':
				case 'Tschechien':
					newFestival.address.countryCode = 'cz';
					newFestival.address.country = 'Czech Republic';
					break;
			
				case 'Danmark':
				case 'Denmark':
					newFestival.address.countryCode = 'dk';
					newFestival.address.country = 'Denmark';
					break;
			
				case 'Deutschland':
				case 'Germany':
					newFestival.address.countryCode = 'de';
					newFestival.address.country = 'Germany';
					break;
				
				case 'Finnland':
					newFestival.address.countryCode = 'fi';
					newFestival.address.country = 'Finland';
					break;
			
				case 'France':
				case 'Frankreich':
					newFestival.address.countryCode = 'fr';
					newFestival.address.country = 'France';
					break;
				
				case 'Israel':
					newFestival.address.countryCode = 'il';
					newFestival.address.country = 'Israel';
					break;
			
				case 'Italien':
				case 'Italy':
					newFestival.address.countryCode = 'it';
					newFestival.address.country = 'Italy';
					break;
			
				case 'Japan':
					newFestival.address.countryCode = 'jp';
					newFestival.address.country = 'Japan';
					break;
			
				case 'Kanada':
					newFestival.address.countryCode = 'ca';
					newFestival.address.country = 'Canada';
					break;
			
				case 'Kroatien':
					newFestival.address.countryCode = 'hr';
					newFestival.address.country = 'Croatia';
					break;
			
				case 'Mexiko':
					newFestival.address.countryCode = 'mx';
					newFestival.address.country = 'Mexico';
					break;
			
				case 'Neuseeland':
					newFestival.address.countryCode = 'nz';
					newFestival.address.country = 'New Zealand';
					break;
			
				case 'Nigeria':
					newFestival.address.countryCode = 'ng';
					newFestival.address.country = 'Nigeria';
					break;
			
				case 'Magyarország':
				case 'Ungarn':
					newFestival.address.countryCode = 'hu';
					newFestival.address.country = 'Hungary';
					break;
			
				case 'Niederlande':
				case 'The Netherlands':
					newFestival.address.countryCode = 'nl';
					newFestival.address.country = 'The Netherlands';
					break;
			
				case 'Norwegen':
					newFestival.address.countryCode = 'no';
					newFestival.address.country = 'Norway';
					break;
			
				case 'Russland':
				case 'Russia':
					newFestival.address.countryCode = 'ru';
					newFestival.address.country = 'Russia';
					break;
			
				case 'Österreich':
				case 'Austria':
					newFestival.address.countryCode = 'at';
					newFestival.address.country = 'Austria';
					break;
			
				case 'Polen':
					newFestival.address.countryCode = 'pl';
					newFestival.address.country = 'Poland';
					break;
			
				case 'Peru':
					newFestival.address.countryCode = 'pe';
					newFestival.address.country = 'Peru';
					break;
			
				case 'Schweiz':
					newFestival.address.countryCode = 'ch';
					newFestival.address.country = 'Switzerland';
					break;
			
				case 'Spanien':
					newFestival.address.countryCode = 'es';
					newFestival.address.country = 'Spain';
					break;
			
				case 'Südafrika':
					newFestival.address.countryCode = 'za';
					newFestival.address.country = 'South Africa';
					break;
			
				case 'Sverige':
				case 'Schweden':
				case 'Sweden':
					newFestival.address.countryCode = 'se';
					newFestival.address.country = 'Sweden';
					break;
					
				case 'United Kingdom':
				case 'Vereinigtes Königreich':
					newFestival.address.countryCode = 'gb';
					newFestival.address.country = 'United Kingdom';
					break;
				
				case 'Vereinigte Staaten von Amerika':
				case 'United States of America':
					newFestival.address.countryCode = 'us';
					newFestival.address.country = 'United States of America';
					break;
				default:
					newFestival.address.countryCode = 'en';
			}

			const update = await validateFestival.validateFestival(newFestival, 'put', { id: festival._id });
			const updated = await Festival.findOneAndUpdate({ _id: festival._id }, update, { new: true });
			return updated;
		});
		const festivalList = await Promise.all(promises3);

		return res.status(200).json({ message: 'Locations updated', data: { bands: bandList, locations: locationList, festivals: festivalList }, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

router.get('/updateAll', async (req, res) => {
	try {
		const bands = await Band.find();
		if (bands.length === 0)
			console.log('No bands found');

		bands.forEach(band => {
			let updatedBand = JSON.parse(JSON.stringify(band));
			updatedBand.website = band.websiteUrl;
			if (updatedBand.website == null) updatedBand.website = '';
			updatedBand.origin.city = band.origin.name;
			if (updatedBand.origin.city == null) updatedBand.origin.city = '';
			Band.findOneAndUpdate({ _id: band._id }, updatedBand, (err, update) => {
				if (err) console.log(err);
				Band.findOneAndUpdate({ _id: band._id }, { $unset: { websiteUrl: 1, 'origin.name': 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const unvalidatedbands = await UnvalidatedBand.find();
		if (unvalidatedbands.length === 0)
			console.log('No unvalidatedBands found');

		unvalidatedbands.forEach(band => {
			let updatedBand = JSON.parse(JSON.stringify(band));
			updatedBand.website = band.websiteUrl;
			if (updatedBand.website == null) updatedBand.website = '';
			UnvalidatedBand.findOneAndUpdate({ _id: band._id }, updatedBand, (err, update) => {
				if (err) console.log(err);
				UnvalidatedBand.findOneAndUpdate({ _id: band._id }, { $unset: { websiteUrl: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const events = await Event.find();
		if (events.length === 0)
			console.log('No events found');

		events.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			Event.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				Event.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const unvalidatedEvents = await UnvalidatedEvent.find();
		if (unvalidatedEvents.length === 0)
			console.log('No unvalidatedEvents found');

		unvalidatedEvents.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			UnvalidatedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				UnvalidatedEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const archivedEvents = await ArchivedEvent.find();
		if (archivedEvents.length === 0)
			console.log('No archivedEvents found');

		archivedEvents.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			ArchivedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				ArchivedEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const festivals = await Festival.find();
		if (festivals.length === 0)
			console.log('No festivals found');

		festivals.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			Festival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				Festival.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const unvalidatedFestivals = await UnvalidatedFestival.find();
		if (unvalidatedFestivals.length === 0)
			console.log('No unvalidatedFestivals found');

		unvalidatedFestivals.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			UnvalidatedFestival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				UnvalidatedFestival.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const festivalEvents = await FestivalEvent.find();
		if (festivalEvents.length === 0)
			console.log('No festivalEvents found');

		festivalEvents.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			FestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				FestivalEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});

		const unvalidatedFestivalEvents = await UnvalidatedFestivalEvent.find();
		if (unvalidatedFestivalEvents.length === 0)
			console.log('No unvalidatedFestivalEvents found');

		unvalidatedFestivalEvents.forEach(object => {
			let updatedObject = JSON.parse(JSON.stringify(object));
			updatedObject.name = object.title;
			if (updatedObject.name == null) updatedObject.name = '';
			UnvalidatedFestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
				if (err) console.log(err);
				UnvalidatedFestivalEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
					if (err) console.log(err);
					console.log(update.name);
				});
			});
		});
		return res.status(200).json({ message: 'fertig' });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});
//###

module.exports = router;