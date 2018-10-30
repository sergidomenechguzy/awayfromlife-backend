const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

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

// unvalidated_bands routes
// get all bands
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const bands = await UnvalidatedBand.find();
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get paginated bands
router.get('/page', token.checkToken(true), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'genre' || req.query.sortBy === 'origin.city') sortBy = req.query.sortBy;

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
			query.$or = [
				{ 'origin.default.city': new RegExp(req.query.city, 'i') },
				{ 'origin.default.administrative': new RegExp(req.query.city, 'i') },
				{ 'origin.default.county': new RegExp(req.query.city, 'i') },
				{ 'origin.international.city': new RegExp(req.query.city, 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'origin.default.country': RegExp(req.query.country, 'i') },
				{ 'origin.international.country': new RegExp(req.query.country, 'i') }
			];
		}
		if (req.query.label) query.recordLabel = RegExp(req.query.label, 'i');

		const bands = await UnvalidatedBand.find(query);
		if (bands.length === 0)
			return res.status(200).json({ message: 'No bands found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(bands, 'band', sortBy, order);

		let finalBands = [];
		if (req.query.genre) {
			const genreRegex = RegExp('^' + req.query.genre + '$', 'i');
			dereferenced.forEach(band => {
				band.genre.some(genre => {
					if (genreRegex.test(genre)) {
						finalBands.push(band);
						return true;
					}
					return false;
				});
			});
		}
		else finalBands = dereferenced;

		const count = finalBands.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);
		finalBands = finalBands.slice((perPage * page) - perPage, (perPage * page));

		return res.status(200).json({ data: finalBands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get band by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedBand.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });

		const dereferenced = await dereference.bandObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all filter data
router.get('/filters', token.checkToken(true), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			genres: [],
			labels: [],
			cities: [],
			countries: []
		};
		const unvalidatedBands = await UnvalidatedBand.find();
		if (unvalidatedBands.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedBands, 'band', 'name', 1);
		dereferenced.forEach(band => {
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
			if (band.origin.city && !filters.cities.includes(band.origin.city))
				filters.cities.push(band.origin.city);
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
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post band to database
router.post('/', token.checkToken(false), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('unvalidated'), async (req, res) => {
	try {
		await new UnvalidatedBand(res.locals.validated).save();
		return res.status(200).json({ message: 'Band saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated band
router.post('/validate/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateObject('validate'), async (req, res) => {
	try {
		await new Band(res.locals.validated).save();
		await UnvalidatedBand.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Band validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post band to database
router.post('/multiple', token.checkToken(false), params.checkListParameters(['name', 'genre', 'origin.city', 'origin.country', 'origin.lat', 'origin.lng', 'origin.countryCode']), validateBand.validateList('unvalidated'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new UnvalidatedBand(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' band(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidBand');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});







const algoliasearch = require('algoliasearch');
const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');

router.get('/updateAddress', async (req, res) => {
	try {
		const bands = await UnvalidatedBand.find();
		const promises1 = bands.map(async (band) => {
			let resAlg = await places.search({ query: band.origin.value ? band.origin.value : `${band.origin.name}, ${band.origin.country}`, language: 'en', type: 'city' });
			let newBand = JSON.parse(JSON.stringify(band));
			if (resAlg.hits[0]) {
				newBand.origin.city = resAlg.hits[0].locale_names[0];
			}

			switch (band.origin.country) {
				case 'Australien':
					newBand.origin.countryCode = 'au';
					newBand.origin.country = 'Australia';
					break;
			
				case 'België - Belgique - Belgien':
				case 'Belgien':
					newBand.origin.countryCode = 'be';
					newBand.origin.country = 'Belgium';
					break;
			
				case 'Brasilien':
				case 'Brazil':
					newBand.origin.countryCode = 'br';
					newBand.origin.country = 'Brazil';
					break;
			
				case 'Česko':
				case 'Tschechien':
					newBand.origin.countryCode = 'cz';
					newBand.origin.country = 'Czech Republic';
					break;
			
				case 'Danmark':
				case 'Denmark':
					newBand.origin.countryCode = 'dk';
					newBand.origin.country = 'Denmark';
					break;
			
				case 'Deutschland':
				case 'Germany':
					newBand.origin.countryCode = 'de';
					newBand.origin.country = 'Germany';
					break;
			
				case 'Finnland':
					newBand.origin.countryCode = 'fi';
					newBand.origin.country = 'Finland';
					break;
			
				case 'France':
				case 'Frankreich':
					newBand.origin.countryCode = 'fr';
					newBand.origin.country = 'France';
					break;
			
				case 'Israel':
					newBand.origin.countryCode = 'il';
					newBand.origin.country = 'Israel';
					break;
			
				case 'Italien':
				case 'Italy':
					newBand.origin.countryCode = 'it';
					newBand.origin.country = 'Italy';
					break;
			
				case 'Japan':
					newBand.origin.countryCode = 'jp';
					newBand.origin.country = 'Japan';
					break;
			
				case 'Kanada':
					newBand.origin.countryCode = 'ca';
					newBand.origin.country = 'Canada';
					break;
			
				case 'Kroatien':
					newBand.origin.countryCode = 'hr';
					newBand.origin.country = 'Croatia';
					break;
			
				case 'Mexiko':
					newBand.origin.countryCode = 'mx';
					newBand.origin.country = 'Mexico';
					break;
			
				case 'Neuseeland':
					newBand.origin.countryCode = 'nz';
					newBand.origin.country = 'New Zealand';
					break;
			
				case 'Nigeria':
					newBand.origin.countryCode = 'ng';
					newBand.origin.country = 'Nigeria';
					break;
			
				case 'Magyarország':
				case 'Ungarn':
					newBand.origin.countryCode = 'hu';
					newBand.origin.country = 'Hungary';
					break;
			
				case 'Niederlande':
				case 'The Netherlands':
					newBand.origin.countryCode = 'nl';
					newBand.origin.country = 'The Netherlands';
					break;
			
				case 'Norwegen':
					newBand.origin.countryCode = 'no';
					newBand.origin.country = 'Norway';
					break;
			
				case 'Russland':
				case 'Russia':
					newBand.origin.countryCode = 'ru';
					newBand.origin.country = 'Russia';
					break;
			
				case 'Österreich':
				case 'Austria':
					newBand.origin.countryCode = 'at';
					newBand.origin.country = 'Austria';
					break;
			
				case 'Polen':
					newBand.origin.countryCode = 'pl';
					newBand.origin.country = 'Poland';
					break;
			
				case 'Peru':
					newBand.origin.countryCode = 'pe';
					newBand.origin.country = 'Peru';
					break;
			
				case 'Schweiz':
					newBand.origin.countryCode = 'ch';
					newBand.origin.country = 'Switzerland';
					break;
			
				case 'Spanien':
					newBand.origin.countryCode = 'es';
					newBand.origin.country = 'Spain';
					break;
			
				case 'Südafrika':
					newBand.origin.countryCode = 'za';
					newBand.origin.country = 'South Africa';
					break;
			
				case 'Sverige':
				case 'Schweden':
				case 'Sweden':
					newBand.origin.countryCode = 'se';
					newBand.origin.country = 'Sweden';
					break;
			
				case 'United Kingdom':
				case 'Vereinigtes Königreich':
					newBand.origin.countryCode = 'gb';
					newBand.origin.country = 'United Kingdom';
					break;
			
				case 'Vereinigte Staaten von Amerika':
				case 'United States of America':
					newBand.origin.countryCode = 'us';
					newBand.origin.country = 'United States of America';
					break;
				default:
					newBand.origin.countryCode = 'en';
			}

			const update = await validateBand.validateBand(newBand, 'validate', { id: band._id });
			const updated = await UnvalidatedBand.findOneAndUpdate({ _id: band._id }, update, { new: true });
			return updated;
		});
		const bandList = await Promise.all(promises1);

		return res.status(200).json({ message: 'Objects updated', data: bandList, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});






module.exports = router;