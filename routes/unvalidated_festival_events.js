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
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const festivalEvents = await UnvalidatedFestivalEvent.find();
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
router.get('/byid/:_id', token.checkToken(true), (req, res) => {
	UnvalidatedFestivalEvent.findById(req.params._id)
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

// post event to database
router.post('/:_id', token.checkToken(false), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('unvalidated'), (req, res) => {
	Festival.findById(req.params._id)
		.then(festival => {
			if (!festival) 
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			
			new UnvalidatedFestivalEvent(res.locals.validated)
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

// validate unvalidated festival event
router.post('/validate/:festivalId/:_id', token.checkToken(true), params.checkParameters(['name', 'startDate', 'endDate', 'bands']), validateFestivalEvent.validateObject('validate'), (req, res) => {
	Festival.findById(req.params.festivalId)
		.then(festival => {
			if (!festival) 
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			if (!festival.events.includes(req.params._id))
				return res.status(400).json({ message: 'No festival event found with this ID in the festival\'s festival event list', token: res.locals.token });
			
			festival.events.splice(festival.events.indexOf(req.params._id), 1);

			new FestivalEvent(res.locals.validated)
				.save()
				.then(event => {
					festival.events.push(event._id);
					Festival.findOneAndUpdate({ _id: req.params.festivalId }, festival, (err, updatedFestival) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						UnvalidatedFestivalEvent.remove({ _id: req.params._id }, (err, removedEvent) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							return res.status(200).json({ message: 'Festival event validated', token: res.locals.token });
						});
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
			
		})
});

// delete event by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	UnvalidatedFestivalEvent.findById(req.params._id)
		.then(event => {
			if (!event) 
				return res.status(400).json({ message: 'No festival event found with this ID', token: res.locals.token });
			
			Festival.findOne({ events: req.params._id })
				.then(festival => {
					if (!festival)
						return res.status(400).json({ message: 'No validated festival with this festival event ID found.', token: res.locals.token });
					
					UnvalidatedFestivalEvent.remove({ _id: req.params._id }, (err, event) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}

						festival.events.splice(festival.events.indexOf(req.params._id), 1);
						Festival.findOneAndUpdate({ _id: festival._id }, festival, (err, updatedFestival) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							return res.status(200).json({ message: 'Festival event deleted', token: res.locals.token });
						});
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;