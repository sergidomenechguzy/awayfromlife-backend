const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load festival event model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// load delete route
const deleteRoute = require('./controller/delete');

// load delete route
const latest = require('./controller/latest');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateBand.js
const validateBand = require('../helpers/validateBand');

// unvalidated_bands routes
// get all bands
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const bands = await UnvalidatedBand.find();
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

// get paginated bands
router.get('/page', token.checkToken(true), async (req, res) => {
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

		const bands = await UnvalidatedBand.find(query);
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
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedBand.findById(req.params._id);
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

// get latest added bands
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('unvalidatedBand', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all filter data
router.get('/filters', token.checkToken(true), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			genres: [],
			labels: [],
			cities: [],
			countries: []
		};
		const unvalidatedBands = await UnvalidatedBand.find();
		if (unvalidatedBands.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedBands, 'band', 'name', 1);
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
router.post('/', token.checkToken(false), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('unvalidated'), async (req, res) => {
	try {
		await new UnvalidatedBand(res.locals.validated).save();
		return res.status(200).json({ message: 'Band saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated band
router.post('/validate/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('validate'), async (req, res) => {
	try {
		const newBand = await new Band(res.locals.validated).save();
		await Promise.all([
			deleteRoute.deleteBandFromEventCollection(Event, req.params._id, newBand._id),
			deleteRoute.deleteBandFromEventCollection(ArchivedEvent, req.params._id, newBand._id),
			deleteRoute.deleteBandFromEventCollection(UnvalidatedEvent, req.params._id, newBand._id),
			deleteRoute.deleteBandFromEventCollection(FestivalEvent, req.params._id, newBand._id),
			deleteRoute.deleteBandFromEventCollection(UnvalidatedFestivalEvent, req.params._id, newBand._id)
		]);
		await UnvalidatedBand.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Band validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post band to database
router.post('/multiple', token.checkToken(false), params.checkListParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateList('unvalidated'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new UnvalidatedBand(object).save();
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

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidatedBand');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;