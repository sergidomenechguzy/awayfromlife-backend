const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Festival_Event');
const Event = mongoose.model('festival_events');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');

// festival_events routes
// get all events
router.get('/', token.checkToken(false), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0) 
				return res.status(200).json({ message: 'No events found', token: res.locals.token });

			dereference.festivalEventObjectArray(events, 'title', 1, (err, responseEvents) => {
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

// get event by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) 
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			
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
router.get('/canceled', token.checkToken(false), (req, res) => {
	Event.find({ canceled: 1 })
		.then(events => {
			if (events.length === 0) 
				return res.status(200).json({ message: 'No canceled events found.', token: res.locals.token });
			
			dereference.festivalEventObjectArray(events, 'title', 1, (err, responseEvents) => {
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
router.post('/', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate', 'bands']), (req, res) => {
	const newEvent = {
		title: req.body.title,
		startDate: req.body.startDate,
		endDate: req.body.endDate,
		bands: req.body.bands,
		canceled: req.body.canceled
	};

	new Event(newEvent)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Event saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate', 'bands']), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) 
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
				
			const update = {
				_id: req.params._id,
				title: req.body.title,
				startDate: req.body.startDate,
				endDate: req.body.endDate,
				bands: req.body.bands ? req.body.bands : event.bands,
				canceled: (req.body.canceled || req.body.canceled == 0) ? req.body.canceled : event.canceled
			};

			Event.findOneAndUpdate({ _id: req.params._id }, update, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Event updated', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) 
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			
			const update = {
				title: event.title,
				startDate: event.startDate,
				endDate: event.endDate,
				bands: event.bands,
				canceled: 1
			};

			Event.findOneAndUpdate({ _id: req.params._id }, update, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Event canceled', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete event by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) 
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			
			Event.remove({ _id: req.params._id }, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Event deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;