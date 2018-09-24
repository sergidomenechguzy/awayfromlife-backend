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
router.post('/', token.checkToken(false), params.checkParameters(['festival.title', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.title', 'event.startDate', 'event.endDate', 'event.bands']), (req, res) => {
	Genre.find()
		.then(genres => {
			let finalGenres = [];
			if (
				req.body.festival.genre.some(reqGenre => {
					return !genres.some(savedGenre => {
						if (savedGenre.name == reqGenre) {
							finalGenres.push(savedGenre._id);
							return true;
						}
						return false;
					});
				})
			) return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.' });

			const newFestival = {
				title: req.body.festival.title,
				url: '',
				description: req.body.festival.description,
				genre: finalGenres,
				events: [],
				address: {
					street: req.body.festival.address.street,
					administrative: req.body.festival.address.administrative,
					city: req.body.festival.address.city,
					county: req.body.festival.address.county,
					country: req.body.festival.address.country,
					postcode: req.body.festival.address.postcode,
					lat: req.body.festival.address.lat,
					lng: req.body.festival.address.lng,
					value: req.body.festival.address.value
				},
				ticketLink: req.body.festival.ticketLink,
				website: req.body.festival.website,
				facebookUrl: req.body.festival.facebookUrl,
			};

			const newEvent = {
				title: req.body.event.title,
				startDate: req.body.event.startDate,
				endDate: req.body.event.endDate,
				bands: req.body.event.bands,
				canceled: req.body.event.canceled
			};

			new Event(newEvent)
				.save()
				.then(event => {
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
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// validate unvalidated festival and festival event
router.post('/validate/:_id', token.checkToken(false), params.checkParameters(['festival.title', 'festival.genre', 'festival.address.street', 'festival.address.city', 'festival.address.country', 'festival.address.lat', 'festival.address.lng', 'event.title', 'event.startDate', 'event.endDate', 'event.bands']), (req, res) => {
	Festival.findOne({ _id: req.params._id })
		.then(festival => {
			if (!festival)
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			const ids = [];
			festival.events.forEach(event => {
				ids.push({_id: event});
			});
			
			Genre.find()
				.then(genres => {
					let finalGenres = [];
					if (
						req.body.festival.genre.some(reqGenre => {
							return !genres.some(savedGenre => {
								if (savedGenre.name == reqGenre) {
									finalGenres.push(savedGenre._id);
									return true;
								}
								return false;
							});
						})
					) return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.' });
		
					const validFestival = {
						title: req.body.festival.title,
						url: '',
						description: req.body.festival.description,
						genre: finalGenres,
						events: [],
						address: {
							street: req.body.festival.address.street,
							administrative: req.body.festival.address.administrative,
							city: req.body.festival.address.city,
							county: req.body.festival.address.county,
							country: req.body.festival.address.country,
							postcode: req.body.festival.address.postcode,
							lat: req.body.festival.address.lat,
							lng: req.body.festival.address.lng,
							value: req.body.festival.address.value
						},
						ticketLink: req.body.festival.ticketLink,
						website: req.body.festival.website,
						facebookUrl: req.body.festival.facebookUrl,
					};
		
					const validEvent = {
						title: req.body.event.title,
						startDate: req.body.event.startDate,
						endDate: req.body.event.endDate,
						bands: req.body.event.bands,
						canceled: req.body.event.canceled
					};
					
					new ValidEvent(validEvent)
						.save()
						.then(event => {
							validFestival.events = [event._id];
							url.generateUrl(validFestival, Festival, (err, responseFestival) => {
								if (err) {
									console.log(err.name + ': ' + err.message);
									return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
								}
								new ValidFestival(responseFestival)
									.save()
									.then(() => {
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
												return res.status(200).json({ message: 'Festival and event validated', token: res.locals.token });
											});
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
				ids.push({_id: event});
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