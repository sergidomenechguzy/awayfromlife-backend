const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load event model
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
// load validateFestivalAndFestivalEvent.js
const validateFestivalAndFestivalEvent = require('../helpers/validateFestivalAndFestivalEvent');

// festivals routes
// get all festivals
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedFestivals = await UnvalidatedFestival.find();
		if (unvalidatedFestivals.length === 0)
			return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedFestivals, 'unvalidatedFestival', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all festivals with unvalidated festival events
router.get('/unvalidated', token.checkToken(false), async (req, res) => {
	try {
		const unvalidatedFestivalEvents = await UnvalidatedFestivalEvent.find();
		if (unvalidatedFestivalEvents.length === 0)
			return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

		const dereferencedFestivalEvents = await dereference.objectArray(unvalidatedFestivalEvents, 'festivalEvent', 'name', 1);

		const promises = dereferencedFestivalEvents.map((event) => {
			return new Promise(async (resolve, reject) => {
				try {
					const festival = await Festival.findOne({ events: event._id });
					if (!festival) {
						const unvalidatedFestival = await UnvalidatedFestival.findOne({ events: event._id });
						if (!unvalidatedFestival) resolve(`No festival found for the festival event: (_id: ${event._id}, name: ${event.name}).`);
						else {
							const finalFestival = await dereference.unvalidatedFestivalObject(unvalidatedFestival);
							resolve({ validated: false, festival: finalFestival, event: event });
						}
					}
					else {
						const finalFestival = await dereference.unvalidatedFestivalObject(festival);
						resolve({ validated: true, festival: finalFestival, event: event });
					}
				}
				catch (err) {
					reject(err);
				}
			});
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ data: responseList, token: res.locals.token });
	}
	catch (err) {
		if (typeof err == 'string')
			return res.status(400).json({ message: err, token: res.locals.token });
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get festival by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedFestival.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

		const dereferenced = await dereference.unvalidatedFestivalObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added festivals
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('unvalidatedFestival', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post festival and event to database
router.post('/', token.checkToken(false), params.checkParameters(['festival.name', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'festival.address.countryCode', 'event.name', 'event.startDate', 'event.endDate', 'event.bands']), validateFestivalAndFestivalEvent.validateObject('unvalidated'), async (req, res) => {
	try {
		const newUnvalidatedFestivalEvent = await new UnvalidatedFestivalEvent(res.locals.validated.event).save();
		let newUnvalidatedFestival = res.locals.validated.festival;
		newUnvalidatedFestival.events = [newUnvalidatedFestivalEvent._id];
		await new UnvalidatedFestival(newUnvalidatedFestival).save();
		return res.status(200).json({ message: 'Festival and festival event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated festival and festival event
router.post('/validate/:festivalId/:eventId', token.checkToken(true), params.checkParameters(['festival.name', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'festival.address.countryCode', 'event.name', 'event.startDate', 'event.endDate', 'event.bands']), validateFestivalAndFestivalEvent.validateObject('validate'), async (req, res) => {
	try {
		if (!res.locals.validated.event.verifiable)
			return res.status(400).json({ message: 'Festival event cannot be validated. All bands have to validated before.', token: res.locals.token });
		const newFestivalEvent = await new FestivalEvent(res.locals.validated.event).save();
		let newFestival = res.locals.validated.festival;
		newFestival.events = [newFestivalEvent._id];
		await new Festival(newFestival).save();
		await UnvalidatedFestival.remove({ _id: req.params.festivalId });
		await UnvalidatedFestivalEvent.remove({ _id: req.params.eventId });
		return res.status(200).json({ message: 'Festival and festival event validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete festival by id
router.delete('/:_id/:eventId', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidatedFestival');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;