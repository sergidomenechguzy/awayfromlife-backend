const mongoose = require('mongoose');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load url.js
const url = require('./url');

// validate all attributes for one location object in the request body
module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let response;
			if (type == 'put' || type == 'validate') response = await validateLocation(req.body, type, { id: req.params._id });
			else response = await validateLocation(req.body, type);
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

// validate all attributes for a list of location objects in the request body
module.exports.validateList = (type) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			for (const current of req.body.list) {
				const response = await validateLocation(current, type, { urlList: urlList });
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
const validateLocation = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		const optionsChecked = options || {};
		const id = optionsChecked.id || '';
		const urlList = optionsChecked.urlList || [];

		try {
			if (!(typeof data.name == 'string' && data.name.length > 0))
				resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			if (!(typeof data.address.street == 'string' && data.address.street.length > 0))
				resolve('Attribute \'address.street\' has to be a string with 1 or more characters.');

			if (!(data.address.administrative == undefined || typeof data.address.administrative == 'string'))
				resolve('Attribute \'address.administrative\' can be left out or has to be a string.');

			if (!(typeof data.address.city == 'string' && data.address.city.length > 0))
				resolve('Attribute \'address.city\' has to be a string with 1 or more characters.');

			if (!(data.address.county == undefined || typeof data.address.county == 'string'))
				resolve('Attribute \'address.county\' can be left out or has to be a string.');

			if (!(typeof data.address.country == 'string' && data.address.country.length > 0))
				resolve('Attribute \'address.country\' has to be a string with 1 or more characters.');

			if (!(data.address.postcode == undefined || typeof data.address.postcode == 'string'))
				resolve('Attribute \'address.postcode\' can be left out or has to be a string.');

			if (typeof data.address.lat != 'number')
				resolve('Attribute \'address.lat\' has to be a number.');

			if (typeof data.address.lng != 'number')
				resolve('Attribute \'address.lng\' has to be a number.');

			if (!(data.address.value == undefined || typeof data.address.value == 'string'))
				resolve('Attribute \'address.value\' can be left out or has to be a string.');

			if (!(data.status == undefined || (typeof data.status == 'string' && (data.status == 'opened' || data.status == 'closed'))))
				resolve('Attribute \'status\' can be left out or has to be either \'opened\' or \'closed\' as a string.');

			if (!(data.information == undefined || typeof data.information == 'string'))
				resolve('Attribute \'information\' can be left out or has to be a string.');

			if (!(data.website == undefined || typeof data.website == 'string'))
				resolve('Attribute \'website\' can be left out or has to be a string.');

			if (!(data.facebookUrl == undefined || typeof data.facebookUrl == 'string'))
				resolve('Attribute \'facebookUrl\' can be left out or has to be a string.');


			if (type == 'put' || type == 'validate') {
				const model = {
					put: Location,
					validate: UnvalidatedLocation
				};
				const object = await model[type].findById(id);
				if (!object)
					resolve('No location found with this ID');

				let newLocation = {
					name: data.name,
					url: '',
					address: {
						street: data.address.street,
						administrative: data.address.administrative != undefined ? data.address.administrative : object.address.administrative,
						city: data.address.city,
						county: data.address.county != undefined ? data.address.county : object.address.county,
						country: data.address.country,
						postcode: data.address.postcode != undefined ? data.address.postcode : object.address.postcode,
						lat: data.address.lat,
						lng: data.address.lng,
						value: data.address.value != undefined ? data.address.value : object.address.value
					},
					status: data.status != undefined ? data.status : object.status,
					information: data.information != undefined ? data.information : object.information,
					website: data.website != undefined ? data.website : object.website,
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : object.facebookUrl
				};
				if (type == 'put') newLocation._id = id;
				const updatedObject = await url.generateUrl(newLocation, 'location');
				resolve(updatedObject);
			}
			else {
				let newLocation = {
					name: data.name,
					url: '',
					address: {
						street: data.address.street,
						administrative: data.address.administrative != undefined ? data.address.administrative : '',
						city: data.address.city,
						county: data.address.county != undefined ? data.address.county : '',
						country: data.address.country,
						postcode: data.address.postcode != undefined ? data.address.postcode : '',
						lat: data.address.lat,
						lng: data.address.lng,
						value: data.address.value != undefined ? data.address.value : ''
					},
					status: data.status != undefined ? data.status : 'opened',
					information: data.information != undefined ? data.information : '',
					website: data.website != undefined ? data.website : '',
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : ''
				};
				if (type == 'unvalidated') resolve(newLocation);
				else {
					const updatedObject = await url.generateUrl(newLocation, 'location', urlList);
					resolve(updatedObject);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}