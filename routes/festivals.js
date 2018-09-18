const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load event model
require('../models/Festival_Event');
const Event = mongoose.model('festival_events');
const UnvalidatedEvent = mongoose.model('unvalidated_festival_events');

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
router.get('/', token.checkToken(false), (req, res) => {
	Festival.find()
		.then(festivals => {
			if (festivals.length === 0)
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

			dereference.festivalObjectArray(festivals, 'title', 1, (err, responseFestivals) => {
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

// get paginated festivals
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = 'title';
	if (req.query.sortBy === 'city' || req.query.sortBy === 'country') sortBy = req.query.sortBy;

	let order = 1;
	if (parseInt(req.query.order) === -1) order = -1;

	let query = {};
	if (req.query.startWith && /^[a-zA-Z#]$/.test(req.query.startWith)) {
		if (req.query.startWith === '#') query.title = new RegExp('^[^a-zäÄöÖüÜ]', 'i');
		else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.title = new RegExp('^[' + req.query.startWith + 'äÄ]', 'i');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.title = new RegExp('^[' + req.query.startWith + 'öÖ]', 'i');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.title = new RegExp('^[' + req.query.startWith + 'üÜ]', 'i');
		else query.title = new RegExp('^' + req.query.startWith, 'i');
	}

	Festival.find(query)
		.then(festivals => {
			if (festivals.length === 0)
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

			dereference.festivalObjectArray(festivals, sortBy, order, (err, responseFestivals) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				if (req.query.city || req.query.country || req.query.genre || req.query.startDate || req.query.endDate) {
					finalFestivals = [];
					responseFestivals.forEach(responseFestival => {
						let result = [];
						if (req.query.city) {
							const cityRegex = RegExp(req.query.city, 'i');
							if (cityRegex.test(responseFestival.address.city) || cityRegex.test(responseFestival.address.county))
								result.push(true);
							else result.push(false);
						}
						else if (req.query.country) {
							const countryRegex = RegExp(req.query.country, 'i');
							if (countryRegex.test(responseFestival.address.country))
								result.push(true);
							else result.push(false);
						}
						if (req.query.genre) {
							const genreRegex = RegExp(req.query.genre, 'i');
							result.push(
								responseFestival.genre.some(genre => {
									return genreRegex.test(genre);
								})
							);
						}
						if (req.query.startDate || req.query.endDate) {
							result.push(responseFestival.events.some(event => {
								if (req.query.startDate && req.query.endDate) {
									if (
										Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(event.startDate).valueOf() / 86400000)
										&&
										Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(event.startDate).valueOf() / 86400000)
									) return true;
									else return false;
								}
								else if (req.query.startDate) {
									if (Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(event.startDate).valueOf() / 86400000))
										return true;
									else return false;
								}
								else if (req.query.endDate) {
									if (Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(event.startDate).valueOf() / 86400000))
										return true;
									else return false;
								}
								else return false;
							}));
						}
						if (result.reduce((acc, current) => acc && current, true)) finalFestivals.push(responseFestival);
					});
					responseFestivals = finalFestivals;
				}

				const count = responseFestivals.length;
				if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

				responseFestivals = responseFestivals.slice((perPage * page) - perPage, (perPage * page));
				return res.status(200).json({ data: responseFestivals, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get festival by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
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
					url.generateUrl(newFestival, Festival, (err, responseFestival) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						new Festival(responseFestival)
							.save()
							.then(() => {
								return res.status(200).json({ message: 'Festival and event saved', token: res.locals.token });
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
});

// // update festival by id
// router.put('/:_id', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate']), (req, res) => {
// 	Festival.findOne({ _id: req.params._id })
// 		.then(festival => {
// 			if (!festival) 
// 				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

// 			const update = {
// 				_id: req.params._id,
// 				title: req.body.title,
// 				startDate: req.body.startDate,
// 				endDate: req.body.endDate,
// 				bands: req.body.bands ? req.body.bands : festival.bands,
// 				canceled: req.body.canceled ? req.body.canceled : festival.canceled
// 			};

// 			Festival.findOneAndUpdate({ _id: req.params._id }, update, (err, festival) => {
// 				if (err) {
// 					console.log(err.name + ': ' + err.message);
// 					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 				}
// 				return res.status(200).json({ message: 'Event updated', token: res.locals.token });
// 			});
// 		})
// 		.catch(err => {
// 			console.log(err.name + ': ' + err.message);
// 			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 		});
// });

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
				Event.remove({ $or: ids}, (err, events) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					UnvalidatedEvent.remove({ $or: ids}, (err, events) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						return res.status(200).json({ message: 'Festival deleted', token: res.locals.token });
					});
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;