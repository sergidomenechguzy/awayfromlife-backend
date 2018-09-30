const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateBand.js
const validateBand = require('../helpers/validateBand');

// bands routes
// get all bands
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const bands = await Band.find();
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all bands including unvalidated bands
router.get('/all', token.checkToken(false), async (req, res) => {
	try {
		const objects = await Band.find();
		const unvalidatedObjects = await UnvalidatedBand.find();
		if (objects.length === 0 && unvalidatedObjects.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(objects, 'band', 'name', 1);
		const dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'band', 'name', 1);
		const allObjects = {
			validated: dereferenced,
			unvalidated: dereferencedUnvalidated
		};
		return res.status(200).json({ data: allObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get paginated bands
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = 'name';
	if (req.query.sortBy === 'genre' || req.query.sortBy === 'origin.name') sortBy = req.query.sortBy;

	let order = 1;
	if (parseInt(req.query.order) === -1) order = -1;

	let query = {};
	if (req.query.startWith && /^[a-zA-Z#]$/.test(req.query.startWith)) {
		if (req.query.startWith === '#') query.name = new RegExp('^[^a-zäÄöÖüÜ]', 'i');
		else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = new RegExp('^[' + req.query.startWith + 'äÄ]', 'i');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = new RegExp('^[' + req.query.startWith + 'öÖ]', 'i');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = new RegExp('^[' + req.query.startWith + 'üÜ]', 'i');
		else query.name = new RegExp('^' + req.query.startWith, 'i');
	}
	if (req.query.city) {
		const cityString = 'origin.name';
		query[cityString] = RegExp(req.query.city, 'i');
	}
	else if (req.query.country) {
		const countryString = 'origin.country';
		query[countryString] = RegExp(req.query.country, 'i');
	}
	if (req.query.label) query.recordLabel = RegExp(req.query.label, 'i');

	Band.find(query)
		.then(bands => {
			if (bands.length === 0)
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });

			dereference.bandObjectArray(bands, sortBy, order, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				let finalBands = [];
				if (req.query.genre) {
					const genreRegex = RegExp(req.query.genre, 'i');
					responseBands.forEach(responseBand => {
						responseBand.genre.some(genre => {
							if (genreRegex.test(genre)) {
								finalBands.push(responseBand);
								return true;
							}
							return false;
						});
					});
				}
				else finalBands = responseBands;

				const count = finalBands.length;
				if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);
				finalBands = finalBands.slice((perPage * page) - perPage, (perPage * page));

				return res.status(200).json({ data: finalBands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get band by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await Band.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });

		const dereferenced = await dereference.bandObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get band by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await Band.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') });
		if (!object)
			return res.status(400).json({ message: 'No band found with this URL', token: res.locals.token });

		const dereferenced = await dereference.bandObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all bands events
router.get('/events/:_id', token.checkToken(false), (req, res) => {
	Event.find({ bands: req.params._id })
		.then(events => {
			if (events.length === 0) return res.status(200).json({ message: 'No events found for this band.', token: res.locals.token });

			dereference.eventObjectArray(events, 'date', 1, (err, responseEvents) => {
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

// get bands by name
router.get('/name/:name', token.checkToken(false), (req, res) => {
	let regex = '.*' + req.params.name + '.*';
	Band.find({ name: new RegExp(regex, 'gi') })
		.then(bands => {
			if (bands.length === 0)
				return res.status(200).json({ message: 'No band found with this name', token: res.locals.token });

			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(false), (req, res) => {
	let regex = new RegExp('^' + req.params.genre + '$', 'i');
	Band.find()
		.then(bands => {
			if (bands.length === 0)
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });

			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				let genreBands = [];
				responseBands.forEach(band => {
					band.genre.some(genre => {
						if (regex.test(genre)) {
							genreBands.push(band);
							return true;
						}
						return false;
					});
				});
				return res.status(200).json({ data: genreBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all genres
router.get('/genres', token.checkToken(false), (req, res) => {
	let genreList = [];
	Band.find()
		.then(bands => {
			Genre.find()
				.then(genres => {
					genres.forEach(genre => {
						bands.some(band => {
							if (band.genre.includes('' + genre._id)) {
								genreList.push(genre.name);
								return true;
							}
							return false;
						});
					});
					genreList.sort((a, b) => {
						return a.localeCompare(b);
					});
					return res.status(200).json({ data: genreList, token: res.locals.token });
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

// get all labels
router.get('/labels', token.checkToken(false), (req, res) => {
	let labelList = [];
	Band.find()
		.then(bands => {
			bands.forEach(band => {
				if (band.recordLabel && !labelList.includes(band.recordLabel)) labelList.push(band.recordLabel);
			});
			labelList.sort((a, b) => {
				return a.localeCompare(b);
			});
			return res.status(200).json({ data: labelList, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get similar bands
router.get('/similar', token.checkToken(false), (req, res) => {
	if (!req.query.name || !req.query.country)
		return res.status(400).json({ message: 'Parameter(s) missing: name and country are required.' });
	let query = {};
	query.name = new RegExp('^' + req.query.name + '$', 'i');
	const countryString = 'origin.country';
	query[countryString] = new RegExp('^' + req.query.country + '$', 'i');

	Band.find(query)
		.then(bands => {
			if (bands.length === 0)
				return res.status(200).json({ message: 'No bands found with this name from this country.', token: res.locals.token });

			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all filter data
router.get('/filters', token.checkToken(false), (req, res) => {
	let filters = {
		startWith: [],
		genres: [],
		labels: [],
		cities: [],
		countries: []
	};
	Band.find()
		.then(bands => {
			if (bands.length === 0)
				return res.status(200).json({ data: filters, token: res.locals.token });

			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				responseBands.forEach(band => {
					if (band.name && !filters.startWith.includes(band.name.charAt(0).toUpperCase())) {
						if (band.name.charAt(0).toUpperCase() === 'Ä') {
							if (!filters.startWith.includes('A')) filters.startWith.push('A');
						}
						else if (band.name.charAt(0).toUpperCase() === 'Ö') {
							if (!filters.startWith.includes('O')) filters.startWith.push('O');
						}
						else if (band.name.charAt(0).toUpperCase() === 'Ü') {
							if (!filters.startWith.includes('U')) filters.startWith.push('U');
						}
						else if (/[A-Z]/.test(band.name.charAt(0).toUpperCase()))
							filters.startWith.push(band.name.charAt(0).toUpperCase());
						else if (!filters.startWith.includes('#'))
							filters.startWith.push('#');
					}
					band.genre.forEach(genre => {
						if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
					});
					if (band.recordLabel && !filters.labels.includes(band.recordLabel))
						filters.labels.push(band.recordLabel);
					if (band.origin.name && !filters.cities.includes(band.origin.name))
						filters.cities.push(band.origin.name);
					if (band.origin.country && !filters.countries.includes(band.origin.country))
						filters.countries.push(band.origin.country);
				});
				filters.startWith.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.genres.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.labels.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.cities.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.countries.sort((a, b) => {
					return a.localeCompare(b);
				});
				return res.status(200).json({ data: filters, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post band to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validateBand.validateObject('post'), async (req, res) => {
	try {
		await new Band(res.locals.validated).save();
		return res.status(200).json({ message: 'Band saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post multiple bands to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validateBand.validateList('post'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new Band(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' band(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// update band by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validateBand.validateObject('put'), async (req, res) => {
	try {
		await Band.findOneAndUpdate({ _id: req.params._id }, res.locals.validated);
		return res.status(200).json({ message: 'Band updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'validBand');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});







// load event model
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const ArchivedEvent = mongoose.model('archived_events');

// load band model
require('../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load band model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// router.get('/update/website', async (req, res) => {
// 	try {
// 		const events = await Event.find();
// 		if (events.length === 0)
// 			console.log('No events found');

// 		events.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			Event.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const unvalidatedEvents = await UnvalidatedEvent.find();
// 		if (unvalidatedEvents.length === 0)
// 			console.log('No unvalidatedEvents found');

// 		unvalidatedEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			UnvalidatedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const archivedEvents = await ArchivedEvent.find();
// 		if (archivedEvents.length === 0)
// 			console.log('No archivedEvents found');

// 		archivedEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			ArchivedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const festivals = await Festival.find();
// 		if (festivals.length === 0)
// 			console.log('No festivals found');

// 		festivals.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			Festival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const unvalidatedFestivals = await UnvalidatedFestival.find();
// 		if (unvalidatedFestivals.length === 0)
// 			console.log('No unvalidatedFestivals found');

// 		unvalidatedFestivals.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			UnvalidatedFestival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const festivalEvents = await FestivalEvent.find();
// 		if (festivalEvents.length === 0)
// 			console.log('No festivalEvents found');

// 		festivalEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			FestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});

// 		const unvalidatedFestivalEvents = await UnvalidatedFestivalEvent.find();
// 		if (unvalidatedFestivalEvents.length === 0)
// 			console.log('No unvalidatedFestivalEvents found');

// 		unvalidatedFestivalEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.title = object.name;
// 			if (updatedObject.title == null || updatedObject.title == undefined) updatedObject.title = '';
// 			UnvalidatedFestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				console.log(update.name);
// 			});
// 		});
// 		return res.status(200).json({ message: 'fertig' });
// 	}
// 	catch (err) {
// 		console.log(err.name + ': ' + err.message);
// 		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 	}
// });





// router.get('/update/website', async (req, res) => {
// 	try {
// 		const bands = await Band.find();
// 		if (bands.length === 0)
// 			console.log('No bands found');

// 		bands.forEach(band => {
// 			let updatedBand = JSON.parse(JSON.stringify(band));
// 			updatedBand.website = band.websiteUrl;
// 			if (updatedBand.website == null) updatedBand.website = '';
// 			Band.findOneAndUpdate({ _id: band._id }, updatedBand, (err, update) => {
// 				if (err) console.log(err);
// 				Band.findOneAndUpdate({ _id: band._id }, { $unset: { websiteUrl: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const unvalidatedbands = await UnvalidatedBand.find();
// 		if (unvalidatedbands.length === 0)
// 			console.log('No unvalidatedBands found');

// 		unvalidatedbands.forEach(band => {
// 			let updatedBand = JSON.parse(JSON.stringify(band));
// 			updatedBand.website = band.websiteUrl;
// 			if (updatedBand.website == null) updatedBand.website = '';
// 			UnvalidatedBand.findOneAndUpdate({ _id: band._id }, updatedBand, (err, update) => {
// 				if (err) console.log(err);
// 				UnvalidatedBand.findOneAndUpdate({ _id: band._id }, { $unset: { websiteUrl: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const events = await Event.find();
// 		if (events.length === 0)
// 			console.log('No events found');

// 		events.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			Event.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				Event.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const unvalidatedEvents = await UnvalidatedEvent.find();
// 		if (unvalidatedEvents.length === 0)
// 			console.log('No unvalidatedEvents found');

// 		unvalidatedEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			UnvalidatedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				UnvalidatedEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const archivedEvents = await ArchivedEvent.find();
// 		if (archivedEvents.length === 0)
// 			console.log('No archivedEvents found');

// 		archivedEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			ArchivedEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				ArchivedEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const festivals = await Festival.find();
// 		if (festivals.length === 0)
// 			console.log('No festivals found');

// 		festivals.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			Festival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				Festival.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const unvalidatedFestivals = await UnvalidatedFestival.find();
// 		if (unvalidatedFestivals.length === 0)
// 			console.log('No unvalidatedFestivals found');

// 		unvalidatedFestivals.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			UnvalidatedFestival.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				UnvalidatedFestival.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const festivalEvents = await FestivalEvent.find();
// 		if (festivalEvents.length === 0)
// 			console.log('No festivalEvents found');

// 		festivalEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			FestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				FestivalEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});

// 		const unvalidatedFestivalEvents = await UnvalidatedFestivalEvent.find();
// 		if (unvalidatedFestivalEvents.length === 0)
// 			console.log('No unvalidatedFestivalEvents found');

// 		unvalidatedFestivalEvents.forEach(object => {
// 			let updatedObject = JSON.parse(JSON.stringify(object));
// 			updatedObject.name = object.title;
// 			if (updatedObject.name == null) updatedObject.name = '';
// 			UnvalidatedFestivalEvent.findOneAndUpdate({ _id: object._id }, updatedObject, (err, update) => {
// 				if (err) console.log(err);
// 				UnvalidatedFestivalEvent.findOneAndUpdate({ _id: object._id }, { $unset: { title: 1 } }, (err, update) => {
// 					if (err) console.log(err);
// 					console.log(update.name);
// 				});
// 			});
// 		});
// 		return res.status(200).json({ message: 'fertig' });
// 	}
// 	catch (err) {
// 		console.log(err.name + ': ' + err.message);
// 		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 	}
// });

module.exports = router;