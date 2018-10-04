const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

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

moment.locale('de');

// events routes
// get all events
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find();
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all events including unvalidated events
router.get('/all', token.checkToken(false), async (req, res) => {
	try {
		const objects = await Event.find();
		const unvalidatedObjects = await UnvalidatedEvent.find();
		if (objects.length === 0 && unvalidatedObjects.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(objects, 'event', 'name', 1);
		const dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'event', 'name', 1);
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

// get paginated events
router.get('/page', token.checkToken(false), async (req, res) => {
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

		const events = await Event.find(query);
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
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await Event.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		const dereferenced = await dereference.eventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get event by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await Event.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') });
		if (!object)
			return res.status(400).json({ message: 'No event found with this URL', token: res.locals.token });

		const dereferenced = await dereference.eventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by name
router.get('/name/:name', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find({ name: new RegExp(req.params.name, 'gi') });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found with this name.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by city
router.get('/city/:city', token.checkToken(false), async (req, res) => {
	try {
		const locations = await Location.find({ $or: [{ 'address.city': new RegExp(req.params.city, 'i') }, { 'address.county': new RegExp(req.params.city, 'i') }] });
		if (locations.length === 0)
			return res.status(200).json({ message: 'No locations found in this city.', token: res.locals.token });

		const promises = locations.map(async (location) => {
			let result = await Event.find({ location: location._id });
			if (!result) return [];
			return result;
		});
		let eventList = await Promise.all(promises);
		eventList = eventList.reduce((acc, val) => acc.concat(val), []);

		const dereferenced = await dereference.objectArray(eventList, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by date
router.get('/date/:date', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find({ date: new RegExp('^' + req.params.date) });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found on this date.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get canceled events
router.get('/canceled', token.checkToken(true), async (req, res) => {
	try {
		const events = await Event.find({ canceled: 1 });
		if (events.length === 0)
			return res.status(200).json({ message: 'No canceled events found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get similar events
router.get('/similar', token.checkToken(false), async (req, res) => {
	try {
		if (!req.query.location || !req.query.date)
			return res.status(400).json({ message: 'Parameter(s) missing: location and date are required.' });
		let query = {};
		query.location = req.query.location;
		query.date = new RegExp('^' + req.query.date);

		const events = await Event.find(query);
		if (events.length === 0)
			return res.status(200).json({ message: 'No similar events found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
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
		const events = await Event.find();
		if (events.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);

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
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post event to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('post', 'event'), async (req, res) => {
	try {
		await new Event(res.locals.validated).save();
		return res.status(200).json({ message: 'Event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple events to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'location', 'date', 'bands']), validateEvent.validateList('post', 'event'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new Event(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' event(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('put', 'event'), async (req, res) => {
	try {
		const updated = await Event.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.eventObject(updated);
		return res.status(200).json({ message: 'Event updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), async (req, res) => {
	try {
		const event = await Event.findById(req.params._id);
		if (!event)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		event.canceled = 1;
		event.lastModified = Date.now();

		const updated = await Event.findOneAndUpdate({ _id: req.params._id }, event, { new: true });
		const dereferenced = await dereference.eventObject(updated);
		return res.status(200).json({ message: 'Event canceled', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'validEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;