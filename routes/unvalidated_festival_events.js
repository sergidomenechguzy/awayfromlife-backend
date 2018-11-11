const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

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
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const festivalEvents = await UnvalidatedFestivalEvent.find();
		if (festivalEvents.length === 0)
			return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivalEvents, 'unvalidatedFestivalEvent', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedFestivalEvent.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

		const dereferenced = await dereference.unvalidatedFestivalEventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post event to database
router.post('/:_id', token.checkToken(false), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('unvalidated'), async (req, res) => {
	try {
		const festival = await Festival.findById(req.params._id);
		if (!festival)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

		const newUnvalidatedFestivalEvent = await new UnvalidatedFestivalEvent(res.locals.validated).save();
		festival.events.push(newUnvalidatedFestivalEvent._id);
		await Festival.findOneAndUpdate({ _id: req.params._id }, festival);
		return res.status(200).json({ message: 'Festival event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated festival event
router.post('/validate/:festivalId/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('validate'), async (req, res) => {
	try {
		if (!res.locals.validated.verifiable)
			return res.status(400).json({ message: 'Festival event cannot be validated. All bands have to validated before.', token: res.locals.token });
		const festival = await Festival.findById(req.params.festivalId);
		if (!festival)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
		if (!festival.events.includes(req.params._id))
			return res.status(400).json({ message: 'Festival event ID not found in the festival\'s festival events list', token: res.locals.token });

		festival.events.splice(festival.events.indexOf(req.params._id), 1);

		const newFestivalEvent = await new FestivalEvent(res.locals.validated).save();
		festival.events.push(newFestivalEvent._id);
		await Festival.findOneAndUpdate({ _id: req.params.festivalId }, festival);
		await UnvalidatedFestivalEvent.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Festival event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete event by id
router.delete('/:festivalId/:_id', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedFestivalEvent = await UnvalidatedFestivalEvent.findById(req.params._id);
		if (!unvalidatedFestivalEvent)
			return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

		const festival = await Festival.findOne({ events: req.params._id });
		if (!festival)
			return res.status(400).json({ message: 'No valid festival found with this ID in the festival event list', token: res.locals.token });

		await UnvalidatedFestivalEvent.remove({ _id: req.params._id });
		festival.events.splice(festival.events.indexOf(req.params._id), 1);
		await Festival.findOneAndUpdate({ _id: festival._id }, festival);
		return res.status(200).json({ message: 'Festival event deleted', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;