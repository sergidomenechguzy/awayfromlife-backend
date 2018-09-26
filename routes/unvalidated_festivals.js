const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load festival model
require('../models/Festival');
const Festival = mongoose.model('unvalidated_festivals');
const ValidFestival = mongoose.model('festivals');

// load event model
require('../models/Festival_Event');
const Event = mongoose.model('unvalidated_festival_events');
const ValidEvent = mongoose.model('festival_events');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load url.js
const url = require('../config/url');
// load validate.js
const validate = require('../config/validate');

// festivals routes
// get all festivals
router.get('/', token.checkToken(true), (req, res) => {
	Festival.find()
		.then(festivals => {
			if (festivals.length === 0)
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

			dereference.unvalidatedFestivalObjectArray(festivals, 'title', 1, (err, responseFestivals) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseFestivals, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all festivals with unvalidated festival events
router.get('/unvalidated', token.checkToken(false), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No festival events found', token: res.locals.token });

			dereference.festivalEventObjectArray(events, 'title', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				responseList = [];
				responseEvents.forEach(event => {
					ValidFestival.findOne({ events: event._id })
						.then(validFestival => {
							if (!validFestival) {
								Festival.findOne({ events: event._id })
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
	Festival.findOne({ _id: req.params._id })
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
router.post('/', token.checkToken(false), params.checkParameters(['festival.title', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.title', 'event.startDate', 'event.endDate', 'event.bands']), validate.reqFestivalAndEvent('unvalidated'), (req, res) => {
	new Event(res.locals.validated.event)
		.save()
		.then(event => {
			let newFestival = res.locals.validated.festival;
			newFestival.events = [event._id];
			new Festival(newFestival)
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
router.post('/validate/:festivalId/:eventId', token.checkToken(false), params.checkParameters(['festival.title', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.title', 'event.startDate', 'event.endDate', 'event.bands']), validate.reqFestivalAndEvent('validate'), (req, res) => {
	new ValidEvent(res.locals.validated.event)
		.save()
		.then(event => {
			let newFestival = res.locals.validated.festival;
			newFestival.events = [event._id];
			new ValidFestival(newFestival)
				.save()
				.then(() => {
					Festival.remove({ _id: req.params.festivalId }, (err, removedFestival) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						Event.remove({ _id: req.params.eventId }, (err, events) => {
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
	Festival.findOne({ _id: req.params._id })
		.then(festival => {
			if (!festival)
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			const ids = [];
			festival.events.forEach(event => {
				ids.push({ _id: event });
			});

			Festival.remove({ _id: req.params._id }, (err, removedFestival) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				Event.remove({ $or: ids }, (err, events) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					return res.status(200).json({ message: 'Festival deleted', token: res.locals.token });
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;