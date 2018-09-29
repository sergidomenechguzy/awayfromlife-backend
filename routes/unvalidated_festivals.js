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
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const unvalidatedFestivals = await UnvalidatedFestival.find();
		if (unvalidatedFestivals.length === 0) 
			return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedFestivals, 'unvalidatedFestival', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all festivals with unvalidated festival events
router.get('/unvalidated', token.checkToken(false), (req, res) => {
	UnvalidatedFestivalEvent.find()
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

			dereference.festivalEventObjectArray(events, 'name', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				responseList = [];
				responseEvents.forEach(event => {
					Festival.findOne({ events: event._id })
						.then(validFestival => {
							if (!validFestival) {
								UnvalidatedFestival.findOne({ events: event._id })
									.then(festival => {
										if (!festival)
											return res.status(200).json({ message: 'No festival found', token: res.locals.token });

										dereference.unvalidatedFestivalObject(festival, (err, responseFestivals) => {
											if (err) {
												console.log(err.name + ': ' + err.message);
												return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
											}
											responseList.push({ validated: false, festival: responseFestivals, event: event });
											if (responseList.length == events.length)
												return res.status(200).json({ data: responseList, token: res.locals.token });
										});
									})
									.catch(err => {
										console.log(err.name + ': ' + err.message);
										return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
									});
							}
							else {
								dereference.unvalidatedFestivalObject(validFestival, (err, responseFestivals) => {
									if (err) {
										console.log(err.name + ': ' + err.message);
										return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
									}
									responseList.push({ validated: true, festival: responseFestivals, event: event });
									if (responseList.length == events.length)
										return res.status(200).json({ data: responseList, token: res.locals.token });
								});
							}
						})
						.catch(err => {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						});
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get festival by id
router.get('/byid/:_id', token.checkToken(true), (req, res) => {
	UnvalidatedFestival.findById(req.params._id)
		.then(festival => {
			if (!festival)
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

			dereference.festivalObject(festival, (err, responseFestival) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseFestival, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post festival and event to database
router.post('/', token.checkToken(false), params.checkParameters(['festival.name', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.name', 'event.startDate', 'event.endDate', 'event.bands']), validateFestivalAndFestivalEvent.validateObject('unvalidated'), (req, res) => {
	new UnvalidatedFestivalEvent(res.locals.validated.event)
		.save()
		.then(event => {
			let newFestival = res.locals.validated.festival;
			newFestival.events = [event._id];
			new UnvalidatedFestival(newFestival)
				.save()
				.then(() => {
					return res.status(200).json({ message: 'Festival and event saved', token: res.locals.token });
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

// validate unvalidated festival and festival event
router.post('/validate/:festivalId/:eventId', token.checkToken(false), params.checkParameters(['festival.name', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.name', 'event.startDate', 'event.endDate', 'event.bands']), validateFestivalAndFestivalEvent.validateObject('validate'), (req, res) => {
	new FestivalEvent(res.locals.validated.event)
		.save()
		.then(event => {
			let newFestival = res.locals.validated.festival;
			newFestival.events = [event._id];
			new Festival(newFestival)
				.save()
				.then(() => {
					UnvalidatedFestival.remove({ _id: req.params.festivalId }, (err, removedFestival) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						UnvalidatedFestivalEvent.remove({ _id: req.params.eventId }, (err, events) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							return res.status(200).json({ message: 'Festival and event validated', token: res.locals.token });
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

// delete festival by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	deleteRoute.delete(req.params._id, 'unvalidFestival', (err, response) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	});
});

module.exports = router;