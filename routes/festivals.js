const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load event model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateFestival.js
const validateFestival = require('../helpers/validateFestival');
// load validateFestivalAndFestivalEvent.js
const validateFestivalAndFestivalEvent = require('../helpers/validateFestivalAndFestivalEvent');

// festivals routes
// get all festivals
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const festivals = await Festival.find();
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get paginated festivals
router.get('/page', token.checkToken(false), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'city' || req.query.sortBy === 'country') sortBy = req.query.sortBy;

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
				{ 'address.default.city': new RegExp(req.query.city, 'i') },
				{ 'address.default.administrative': new RegExp(req.query.city, 'i') },
				{ 'address.default.county': new RegExp(req.query.city, 'i') },
				{ 'address.international.city': new RegExp(req.query.city, 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'address.default.country': RegExp(req.query.country, 'i') },
				{ 'address.international.country': new RegExp(req.query.country, 'i') }
			];
		}

		const festivals = await Festival.find(query);
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

		let dereferenced = await dereference.objectArray(festivals, 'festival', sortBy, order);

		if (req.query.genre || req.query.startDate || req.query.endDate) {
			finalFestivals = [];
			dereferenced.forEach(festival => {
				let result = [];
				if (req.query.genre) {
					const genreRegex = RegExp(req.query.genre, 'i');
					result.push(
						festival.genre.some(genre => {
							return genreRegex.test(genre);
						})
					);
				}
				if (req.query.startDate || req.query.endDate) {
					result.push(festival.events.some(event => {
						const matchedStartDate = req.query.startDate ? (event.startDate.localeCompare(req.query.startDate) >= 0) : true;
						const matchedEndDate = req.query.startDate ? (event.startDate.localeCompare(req.query.endDate) <= 0) : true;
						return matchedStartDate && matchedEndDate;
					}));
				}
				if (result.reduce((acc, current) => acc && current, true)) finalFestivals.push(festival);
			});
			if (finalFestivals.length === 0)
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });
			dereferenced = finalFestivals;
		}

		const count = dereferenced.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

		dereferenced = dereferenced.slice((perPage * page) - perPage, (perPage * page));
		return res.status(200).json({ data: dereferenced, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get festival by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await Festival.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

		const dereferenced = await dereference.festivalObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get festival by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await Festival.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') });
		if (!object)
			return res.status(400).json({ message: 'No festival found with this URL', token: res.locals.token });

		const dereferenced = await dereference.festivalObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get similar festivals
router.get('/similar', token.checkToken(false), async (req, res) => {
	try {
		if (!req.query.name || !req.query.city)
			return res.status(400).json({ message: 'Parameter(s) missing: name and city are required.' });
		let query = {
			name: new RegExp('^' + req.query.name + '$', 'i'),
			$or: [
				{ 'address.default.city': new RegExp(req.query.city, 'i') },
				{ 'address.default.administrative': new RegExp(req.query.city, 'i') },
				{ 'address.default.county': new RegExp(req.query.city, 'i') },
				{ 'address.international.city': new RegExp(req.query.city, 'i') }
			]
		};

		const festivals = await Festival.find(query);
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No similar festivals found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);
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
			cities: [],
			countries: [],
			genres: [],
			firstDate: '',
			lastDate: ''
		};
		const festivals = await Festival.find();
		if (festivals.length === 0)
		return res.status(200).json({ data: filters, token: res.locals.token });
		
		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);

		dereferenced.forEach(festival => {
			if (festival.name && !filters.startWith.includes(festival.name.charAt(0).toUpperCase())) {
				if (festival.name.charAt(0).toUpperCase() === 'Ä') {
					if (!filters.startWith.includes('A')) filters.startWith.push('A');
				}
				else if (festival.name.charAt(0).toUpperCase() === 'Ö') {
					if (!filters.startWith.includes('O')) filters.startWith.push('O');
				}
				else if (festival.name.charAt(0).toUpperCase() === 'Ü') {
					if (!filters.startWith.includes('U')) filters.startWith.push('U');
				}
				else if (/[A-Z]/.test(festival.name.charAt(0).toUpperCase()))
					filters.startWith.push(festival.name.charAt(0).toUpperCase());
				else if (!filters.startWith.includes('#'))
					filters.startWith.push('#');
			}
			if (festival.address.city && !filters.cities.includes(festival.address.city))
				filters.cities.push(festival.address.city);
			if (festival.address.country && !filters.countries.includes(festival.address.country))
				filters.countries.push(festival.address.country);

			festival.genre.forEach(genre => {
				if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
			});

			festival.events.forEach(event => {
				if (!filters.firstDate || event.startDate.localeCompare(filters.firstDate) == -1)
					filters.firstDate = event.startDate;
				if (!filters.lastDate || event.endDate.localeCompare(filters.lastDate) == 1)
					filters.lastDate = event.endDate;
			});
		});
		filters.startWith.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.cities.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.countries.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.genres.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: filters, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post festival and event to database
router.post('/', token.checkToken(true), params.checkParameters(['festival.name', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'festival.address.countryCode', 'event.name', 'event.startDate', 'event.endDate', 'event.bands']), validateFestivalAndFestivalEvent.validateObject('post'), async (req, res) => {
	try {
		const newFestivalEvent = await new FestivalEvent(res.locals.validated.event).save();
		let newFestival = res.locals.validated.festival;
		newFestival.events = [newFestivalEvent._id];
		await new Festival(newFestival).save();
		return res.status(200).json({ message: 'Festival and festival event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update festival by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng', 'address.countryCode']), validateFestival.validateObject(), async (req, res) => {
	try {
		const updated = await Festival.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.festivalObject(updated);
		return res.status(200).json({ message: 'Festival updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete festival by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'validFestival');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;