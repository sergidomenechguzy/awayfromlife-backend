const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const escapeStringRegexp = require('escape-string-regexp');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');

// load event model
require(dirPath + '/api/models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');

// load delete.js
const deleteRoute = require(dirPath + '/api/routes/controller/delete');
// load latest.js
const latest = require(dirPath + '/api/routes/controller/latest');
// load token.js
const token = require(dirPath + '/api/helpers/token');
// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');
// load validateFestival.js
const validateFestival = require(dirPath + '/api/helpers/validateFestival');
// load validateFestivalAndFestivalEvent.js
const validateFestivalAndFestivalEvent = require(dirPath + '/api/helpers/validateFestivalAndFestivalEvent');
// load multerConfig.js
const multerConfig = require(dirPath + '/api/config/multerConfig');

// festivals routes
// get all festivals
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const festivals = await Festival.find();
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get paginated festivals
router.get('/page', token.checkToken(false), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'city' || req.query.sortBy === 'country') sortBy = req.query.sortBy;

		let order = 1;
		if (parseInt(req.query.order) === -1) order = -1;

		let query = {};
		if (req.query.startWith && /^[a-z#]$/i.test(req.query.startWith)) {
			if (req.query.startWith === '#') query.name = /^[^a-zäÄöÖüÜ]/i;
			else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = /^[aäÄ]/i;
			else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = /^[oöÖ]/i;
			else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = /^[uüÜ]/i;
			else query.name = new RegExp(`^${escapeStringRegexp(req.query.startWith.trim())}`, 'i');
		}
		if (req.query.city) {
			query.$or = [
				{ 'address.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'address.default.country': RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
				{ 'address.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
			];
		}

		const festivals = await Festival.find(query);
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No festivals found', token: res.locals.token });

		let dereferenced = await dereference.objectArray(festivals, 'festival', sortBy, order);

		if (req.query.genre || req.query.startDate || req.query.endDate) {
			finalFestivals = [];
			dereferenced.forEach(festival => {
				let result = [];
				if (req.query.genre) {
					const genreRegex = RegExp(`^${escapeStringRegexp(req.query.genre.trim())}$`, 'i');
					result.push(
						festival.genre.some(genre => {
							return genreRegex.test(genre);
						})
					);
				}
				if (req.query.startDate || req.query.endDate) {
					result.push(festival.events.some(event => {
						const matchedStartDate = req.query.startDate ? (new Date(event.startDate) >= new Date(req.query.startDate)) : true;
						const matchedEndDate = req.query.endDate ? (new Date(event.startDate) <= new Date(req.query.endDate)) : true;
						return matchedStartDate && matchedEndDate;
					}));
				}
				if (result.reduce((acc, current) => acc && current, true)) finalFestivals.push(festival);
			});
			if (finalFestivals.length === 0)
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });
			dereferenced = finalFestivals;
		}

		const count = dereferenced.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

		dereferenced = dereferenced.slice((perPage * page) - perPage, (perPage * page));
		return res.status(200).json({ data: dereferenced, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get festival by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await Festival.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });

		const dereferenced = await dereference.festivalObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get festival by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await Festival.findOne({ url: new RegExp(`^${escapeStringRegexp(req.params.url.trim())}$`, 'i') });
		if (!object)
			return res.status(400).json({ message: 'No festival found with this URL', token: res.locals.token });

		const dereferenced = await dereference.festivalObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added festivals
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('festival', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get similar festivals
router.get('/similar', token.checkToken(false), async (req, res) => {
	try {
		if (!req.query.name || !req.query.city)
			return res.status(400).json({ message: 'Parameter(s) missing: name and city are required.' });
		let query = {
			name: new RegExp(`^${escapeStringRegexp(req.query.name.trim())}$`, 'i'),
			$or: [
				{ 'address.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
			]
		};

		const festivals = await Festival.find(query);
		if (festivals.length === 0)
			return res.status(200).json({ message: 'No similar festivals found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all filter data
router.get('/filters', token.checkToken(false), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			cities: [],
			countries: [],
			genres: [],
			firstDate: '',
			lastDate: ''
		};
		const festivals = await Festival.find();
		if (festivals.length === 0)
		return res.status(200).json({ data: filters, token: res.locals.token });
		
		const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);

		dereferenced.forEach(festival => {
			if (festival.name && !filters.startWith.includes(festival.name.charAt(0).toUpperCase())) {
				if (festival.name.charAt(0).toUpperCase() === 'Ä') {
					if (!filters.startWith.includes('A')) filters.startWith.push('A');
				}
				else if (festival.name.charAt(0).toUpperCase() === 'Ö') {
					if (!filters.startWith.includes('O')) filters.startWith.push('O');
				}
				else if (festival.name.charAt(0).toUpperCase() === 'Ü') {
					if (!filters.startWith.includes('U')) filters.startWith.push('U');
				}
				else if (/[A-Z]/.test(festival.name.charAt(0).toUpperCase()))
					filters.startWith.push(festival.name.charAt(0).toUpperCase());
				else if (!filters.startWith.includes('#'))
					filters.startWith.push('#');
			}
			if (festival.address.city && !filters.cities.includes(festival.address.city))
				filters.cities.push(festival.address.city);
			if (festival.address.country && !filters.countries.includes(festival.address.country))
				filters.countries.push(festival.address.country);

			festival.genre.forEach(genre => {
				if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
			});

			festival.events.forEach(event => {
				if (!filters.firstDate || event.startDate.localeCompare(filters.firstDate) == -1)
					filters.firstDate = event.startDate;
				if (!filters.lastDate || event.endDate.localeCompare(filters.lastDate) == 1)
					filters.lastDate = event.endDate;
			});
		});
		filters.startWith.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.cities.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.countries.sort((a, b) => {
			return a.localeCompare(b);
		});
		filters.genres.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: filters, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post festival and event to database
router.post('/', token.checkToken(true), multerConfig.upload.fields([{ name: 'festivalImage', maxCount: 1 }, { name: 'eventImage', maxCount: 1 }]), validateFestivalAndFestivalEvent.validateObject('post'), async (req, res) => {
	try {
		const newFestivalEvent = await new FestivalEvent(res.locals.validated.event).save();
		let newFestival = res.locals.validated.festival;
		newFestival.events = [newFestivalEvent._id];
		newFestival = await new Festival(newFestival).save();
		const dereferenced = await dereference.festivalObject(newFestival);
		return res.status(200).json({ message: 'Festival and festival event saved', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update festival by id
router.put('/:_id', token.checkToken(true), multerConfig.upload.single('image'), validateFestival.validateObject(), async (req, res) => {
	try {
		const updated = await Festival.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.festivalObject(updated);
		return res.status(200).json({ message: 'Festival updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete festival by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.deleteObject(req.params._id, 'festival');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;