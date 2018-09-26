const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Festival_Event');
const Event = mongoose.model('festival_events');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load validate.js
const validate = require('../config/validate');

// festival_events routes
// get all events
router.get('/', token.checkToken(false), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

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
	Event.find({ canceled: 1 })
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No canceled festival events found.', token: res.locals.token });

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
router.post('/:_id', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate', 'bands']), validate.reqFestivalEvent('post'), (req, res) => {
	Festival.findOne({ _id: req.params._id })
		.then(festival => {
			if (!festival)
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

			new Event(res.locals.validated)
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
router.put('/:_id', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate', 'bands']), validate.reqFestivalEvent('put'), (req, res) => {
	Event.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, (err, event) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(200).json({ message: 'Festival event updated', token: res.locals.token });
	});
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event)
				return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

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
				return res.status(200).json({ message: 'Festival event canceled', token: res.locals.token });
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
				return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });

			Event.remove({ _id: req.params._id }, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				Festival.findOne({ events: req.params._id })
					.then(festival => {
						if (!festival)
							return res.status(200).json({ message: 'Event deleted', token: res.locals.token });

						festival.events.splice(festival.events.indexOf(req.params.eventId), 1);
						Festival.findOneAndUpdate({ _id: festival._id }, festival, (err, updatedFestival) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							return res.status(200).json({ message: 'Festival event deleted', token: res.locals.token });
						});
					})
					.catch(err => {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;