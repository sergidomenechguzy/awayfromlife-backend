const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load url.js
const url = require(dirPath + '/api/helpers/url');

// validate all attributes for one event object in the request body
module.exports.validateObject = (type, model) => {
	return async (req, res, next) => {
		try {
			let options = {};
			if (type == 'put' || type == 'validate')
				options.id = req.params._id;
			if (req.file != undefined)
				options.image = req.file.path;

			const response = await validateEvent(JSON.parse(req.body.json), type, model, options);
			if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
			res.locals.validated = response;
			return next();
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	}
}

// validate all attributes for a list of event objects in the request body
module.exports.validateList = (type, model) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			const json = JSON.parse(req.body.json);
			for (const current of json.list) {
				const response = await validateEvent(current, type, model, { urlList: urlList });
				if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
				responseList.push(response);
				urlList.push(response.url);
			}
			res.locals.validated = responseList;
			return next();
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	}
}

// check all attributes and build the finished object
const validateEvent = (data, type, collection, options) => {
	return new Promise(async (resolve, reject) => {
		const optionsChecked = options || {};
		const id = optionsChecked.id || '';
		const urlList = optionsChecked.urlList || [];
		const image = optionsChecked.image || '';

		try {
			let verifiable = true;

			if (!(typeof data.name == 'string' && data.name.trim().length > 0))
				resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			if (!(data.description == undefined || typeof data.description == 'string'))
				resolve('Attribute \'description\' can be left out or has to be a string.');

			let locationId;
			if (!(typeof data.location == 'string' && data.location.length > 0)) {
				if (!(typeof data.location == 'object' && data.location._id != undefined))
					resolve('Attribute \'location\' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database.');
				else locationId = data.location._id;
			}
			else locationId = data.location;
			const locations = await Location.find();
			const locationIds = locations.map(location => location._id.toString());
			if (!locationIds.includes(locationId)) {
				if (type == 'unvalidated' || type == 'validate') {
					const unvalidatedLocations = await UnvalidatedLocation.find();
					const unvalidatedLocationIds = unvalidatedLocations.map(location => location._id.toString());
					if (!unvalidatedLocationIds.includes(locationId))
						resolve('Attribute \'location\' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database.');
					else if (type == 'validate')
						resolve({ verifiable: false });
					verifiable = false;
				}
				else {
					resolve('Attribute \'location\' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database.');
				}
			}

			if (!(typeof data.date == 'string' && data.date.length > 0 && moment(data.date, 'YYYY-MM-DD', true).isValid()))
				resolve('Attribute \'date\' has to be a string in the \'YYYY-MM-DD\' date format.');

			if (!(data.time == undefined || typeof data.time == 'string'))
				resolve('Attribute \'time\' can be left out or has to be a string.');

			let bandList = [];
			if (!(Array.isArray(data.bands) && data.bands.length > 0))
				resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');
			else {
				if (
					data.bands.some(band => {
						if (!(typeof band == 'string' && band.length > 0)) {
							if (!(typeof band == 'object' && band._id != undefined))
								return true;
							else {
								bandList.push(band._id);
								return false;
							}
						}
						else {
							bandList.push(band);
							return false;
						}
					})
				)
					resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');
			}
			const bands = await Band.find();
			const bandIds = bands.map(band => band._id.toString());
			const unvalidatedBands = await UnvalidatedBand.find();
			const unvalidatedBandIds = unvalidatedBands.map(band => band._id.toString());
			let unvalidCount = 0;
			if (
				bandList.some(band => {
					if (!bandIds.includes(band)) {
						if (unvalidatedBandIds.includes(band)) {
							verifiable = false;
							unvalidCount++;
							return false;
						}
						return true;
					}
					return false;
				})
			) resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');
			if ((type == 'put' || type == 'post') && unvalidCount == bandList.length) resolve('Attribute \'bands\' has to include at least one validated band from the database.');

			if (!(data.canceled == undefined || (typeof data.canceled == 'number' && (data.canceled == 0 || data.canceled == 1 || data.canceled == 2))))
				resolve('Attribute \'canceled\' can be left out or has to be either \'0\', \'1\' or \'2\' as a number.');

			if (!(data.ticketLink == undefined || typeof data.ticketLink == 'string'))
				resolve('Attribute \'ticketLink\' can be left out or has to be a string.');


			if (type == 'put' || type == 'validate') {
				const model = {
					event: Event,
					archive: ArchivedEvent,
					unvalidated: UnvalidatedEvent
				};
				const object = await model[collection].findById(id);
				if (!object)
					resolve('No event found with this ID');

				let newEvent = {
					name: data.name.trim(),
					url: '',
					description: data.description != undefined ? data.description : object.description,
					location: locationId,
					date: data.date,
					time: data.time != undefined ? data.time : object.time,
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : object.canceled,
					ticketLink: data.ticketLink != undefined ? data.ticketLink : object.ticketLink,
					verifiable: verifiable,
					lastModified: Date.now(),
					image: image
				};
				if (type == 'put') newEvent._id = id;
				const updatedObject = await url.generateEventUrl(newEvent, collection);
				resolve(updatedObject);
			}
			else {
				let newEvent = {
					name: data.name.trim(),
					url: '',
					description: data.description != undefined ? data.description : '',
					location: locationId,
					date: data.date,
					time: data.time != undefined ? data.time : '',
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : 0,
					ticketLink: data.ticketLink != undefined ? data.ticketLink : '',
					verifiable: verifiable,
					image: image
				};
				if (type == 'unvalidated') resolve(newEvent);
				else {
					const updatedObject = await url.generateEventUrl(newEvent, collection, urlList);
					resolve(updatedObject);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}