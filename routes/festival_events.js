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
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	FestivalEvent.findById(req.params._id)
		.then(event => {
			if (!event)
				return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

			dereference.festivalEventObject(event, (err, responseEvent) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseEvent, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get canceled events
router.get('/canceled', token.checkToken(true), (req, res) => {
	FestivalEvent.find({ canceled: 1 })
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No canceled festival events found.', token: res.locals.token });

			dereference.festivalEventObjectArray(events, 'name', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post event to database
router.post('/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('post'), (req, res) => {
	Festival.findById(req.params._id)
		.then(festival => {
			if (!festival)
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

			new FestivalEvent(res.locals.validated)
				.save()
				.then(event => {
					festival.events.push(event._id);
					Festival.findOneAndUpdate({ _id: req.params._id }, festival, (err, updatedFestival) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						return res.status(200).json({ message: 'Festival event saved', token: res.locals.token });
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});

		})
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('put'), async (req, res) => {
	try {
		await FestivalEvent.findOneAndUpdate({ _id: req.params._id }, res.locals.validated);
		return res.status(200).json({ message: 'Festival event updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), async (req, res) => {
	try {
		const event = await FestivalEvent.findById(req.params._id);
		if (!event)
			return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

		event.canceled = 1;
		
		await FestivalEvent.findOneAndUpdate({ _id: req.params._id }, event);
		return res.status(200).json({ message: 'Festival event updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	deleteRoute.delete(req.params._id, 'validFestivalEvent', (err, response) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	});
});

module.exports = router;