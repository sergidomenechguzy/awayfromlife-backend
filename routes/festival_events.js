const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

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
// load validateFestivalEvent.js
const validateFestivalEvent = require('../helpers/validateFestivalEvent');

// festival_events routes
// get all events
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const festivalEvents = await FestivalEvent.find();
		if (festivalEvents.length === 0)
			return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivalEvents, 'festivalEvent', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await FestivalEvent.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

		const dereferenced = await dereference.festivalEventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added events
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('festivalEvent', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get canceled events
router.get('/canceled', token.checkToken(false), async (req, res) => {
	try {
		const festivalEvents = await FestivalEvent.find({ canceled: 1 });
		if (festivalEvents.length === 0)
			return res.status(200).json({ message: 'No canceled festival events found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivalEvents, 'festivalEvent', 'name', 1);
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
		if (!req.query.festival || !req.query.startDate || !req.query.endDate)
			return res.status(400).json({ message: 'Parameter(s) missing: festival, startDate and endDate are required.' });

		const festival = await Festival.findById(req.query.festival);
		if (!festival)
			return res.status(400).json({ message: 'No festival found with this ID.', token: res.locals.token });

		const dereferenced = await dereference.festivalObject(festival);
		let similarFestivalEvent;
		dereferenced.events.some(festivalEvent => {
			if ((festivalEvent.startDate.localeCompare(req.query.endDate) <= 0) && (festivalEvent.endDate.localeCompare(req.query.startDate) >= 0)) {
				similarFestivalEvent = festivalEvent;
				return true;
			}
			return false;
		});
		if (similarFestivalEvent == undefined)
			return res.status(200).json({ message: 'No similar festival events found.', token: res.locals.token });

		return res.status(200).json({ data: similarFestivalEvent, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post event to database
router.post('/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('post'), async (req, res) => {
	try {
		const festival = await Festival.findById(req.params._id);
		if (!festival)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

		const newFestivalEvent = await new FestivalEvent(res.locals.validated).save();
		festival.events.push(newFestivalEvent._id);
		await Festival.findOneAndUpdate({ _id: req.params._id }, festival);
		return res.status(200).json({ message: 'Festival event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('put'), async (req, res) => {
	try {
		const updated = await FestivalEvent.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.festivalEventObject(updated);
		return res.status(200).json({ message: 'Festival event updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), async (req, res) => {
	try {
		const event = await FestivalEvent.findById(req.params._id);
		if (!event)
			return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

		event.canceled = 1;

		const updated = await FestivalEvent.findOneAndUpdate({ _id: req.params._id }, event, { new: true });
		const dereferenced = await dereference.festivalEventObject(updated);
		return res.status(200).json({ message: 'Festival event canceled', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'validFestivalEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;