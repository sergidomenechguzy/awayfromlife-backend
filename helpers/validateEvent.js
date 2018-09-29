const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load url.js
const url = require('./url');

// validate all attributes for one event object in the request body
module.exports.validateObject = (type, model) => {
	return async (req, res, next) => {
		try {
			let response;
			if (type == 'put') response = await validateEvent(req.body, type, model, { id: req.params._id });
			else response = await validateEvent(req.body, type, model);
			if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
			res.locals.validated = response;
			return next();
		}
		catch (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
	}
}

// validate all attributes for a list of event objects in the request body
module.exports.validateList = (type, model) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			for (const current of req.body.list) {
				const response = await validateEvent(current, type, model, { urlList: urlList });
				if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
				responseList.push(response);
				urlList.push(response.url);
			}
			res.locals.validated = responseList;
			return next();
		}
		catch (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
	}
}

// check all attributes and build the finished object
const validateEvent = (data, type, collection, options) => {
	return new Promise(async (resolve, reject) => {
		const optionsChecked = options || {};
		const id = optionsChecked.id || '';
		const urlList = optionsChecked.urlList || [];

		try {
			if (!(typeof data.name == 'string' && data.name.length > 0))
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
			if (!locationIds.includes(locationId))
				resolve('Attribute \'location\' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database.');

			if (!(typeof data.date == 'string' && data.date.length > 0))
				resolve('Attribute \'date\' has to be a string with 1 or more characters.');

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
			if (
				bandList.some(band => {
					if (!bandIds.includes(band)) return true;
					return false;
				})
			) resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');

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
					name: data.name,
					url: '',
					description: data.description != undefined ? data.description : object.description,
					location: locationId,
					date: data.date,
					time: data.time != undefined ? data.time : object.time,
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : object.canceled,
					ticketLink: data.ticketLink != undefined ? data.ticketLink : object.ticketLink,
					lastModified: Date.now()
				};
				if (type == 'put') newEvent._id = id;
				const updatedObject = await url.generateEventUrl(newEvent, collection);
				resolve(updatedObject);
			}
			else {
				let newEvent = {
					name: data.name,
					url: '',
					description: data.description != undefined ? data.description : '',
					location: locationId,
					date: data.date,
					time: data.time != undefined ? data.time : '',
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : 0,
					ticketLink: data.ticketLink != undefined ? data.ticketLink : ''
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