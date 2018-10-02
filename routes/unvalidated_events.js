const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateEvent.js
const validateEvent = require('../helpers/validateEvent');

// unvalidated_events routes
// get all events
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedEvents = await UnvalidatedEvent.find();
		if (unvalidatedEvents.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedEvents, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get paginated events
router.get('/page', token.checkToken(true), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'date' || req.query.sortBy === 'location') sortBy = req.query.sortBy;

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

		const events = await UnvalidatedEvent.find(query);
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		let dereferenced = await dereference.objectArray(events, 'event', sortBy, order);

		if (req.query.city || req.query.country || req.query.genre || req.query.startDate || req.query.endDate) {
			finalEvents = [];
			dereferenced.forEach(event => {
				let result = [];
				if (req.query.city) {
					const cityRegex = RegExp(req.query.city, 'i');
					if (cityRegex.test(event.location.address.city) || cityRegex.test(event.location.address.county))
						result.push(true);
					else result.push(false);
				}
				else if (req.query.country) {
					const countryRegex = RegExp(req.query.country, 'i');
					if (countryRegex.test(event.location.address.country))
						result.push(true);
					else result.push(false);
				}
				if (req.query.genre) {
					const genreRegex = RegExp(req.query.genre, 'i');
					result.push(
						event.bands.some(band => {
							return band.genre.some(genre => {
								return genreRegex.test(genre);
							});
						})
					);
				}
				if (req.query.startDate && req.query.endDate) {
					if (
						Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(event.date).valueOf() / 86400000)
						&&
						Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(event.date).valueOf() / 86400000)
					) result.push(true);
					else result.push(false);
				}
				else if (req.query.startDate) {
					if (Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(event.date).valueOf() / 86400000))
						result.push(true);
					else result.push(false);
				}
				else if (req.query.endDate) {
					if (Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(event.date).valueOf() / 86400000))
						result.push(true);
					else result.push(false);
				}
				if (result.reduce((acc, current) => acc && current, true)) finalEvents.push(event);
			});
			dereferenced = finalEvents;
		}

		const count = dereferenced.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

		dereferenced = dereferenced.slice((perPage * page) - perPage, (perPage * page));
		return res.status(200).json({ data: dereferenced, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedEvent.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		const dereferenced = await dereference.eventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all filter data
router.get('/filters', token.checkToken(true), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			cities: [],
			countries: [],
			genres: [],
			firstDate: '',
			lastDate: ''
		};
		const unvalidatedEvents = await UnvalidatedEvent.find();
		if (unvalidatedEvents.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedEvents, 'event', 'date', 1);

		filters.firstDate = dereferenced[0].date;
		filters.lastDate = dereferenced[dereferenced.length - 1].date;

		dereferenced.forEach(event => {
			if (event.name && !filters.startWith.includes(event.name.charAt(0).toUpperCase())) {
				if (event.name.charAt(0).toUpperCase() === 'Ä') {
					if (!filters.startWith.includes('A')) filters.startWith.push('A');
				}
				else if (event.name.charAt(0).toUpperCase() === 'Ö') {
					if (!filters.startWith.includes('O')) filters.startWith.push('O');
				}
				else if (event.name.charAt(0).toUpperCase() === 'Ü') {
					if (!filters.startWith.includes('U')) filters.startWith.push('U');
				}
				else if (/[A-Z]/.test(event.name.charAt(0).toUpperCase()))
					filters.startWith.push(event.name.charAt(0).toUpperCase());
				else if (!filters.startWith.includes('#'))
					filters.startWith.push('#');
			}
			if (event.location.address.city && !filters.cities.includes(event.location.address.city))
				filters.cities.push(event.location.address.city);
			if (event.location.address.country && !filters.countries.includes(event.location.address.country))
				filters.countries.push(event.location.address.country);

			event.bands.forEach(band => {
				band.genre.forEach(genre => {
					if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
				});
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
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post event to database
router.post('/', token.checkToken(false), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('unvalidated', 'unvalidated'), async (req, res) => {
	try {
		await new UnvalidatedEvent(res.locals.validated).save();
		return res.status(200).json({ message: 'Event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// validate unvalidated event
router.post('/validate/:_id', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('validate', 'unvalidated'), async (req, res) => {
	try {
		await new Event(res.locals.validated).save();
		await UnvalidatedEvent.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Event validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post multiple events to database
router.post('/multiple', token.checkToken(false), params.checkListParameters(['name', 'location', 'date', 'bands']), validateEvent.validateList('unvalidated', 'unvalidated'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new UnvalidatedEvent(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' event(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

module.exports = router;