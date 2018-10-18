const mongoose = require('mongoose');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load url.js
const url = require('./url');

// validate all attributes for one band object in the request body
module.exports.validateObject = () => {
	return async (req, res, next) => {
		try {
			const response = await validateFestival(req.body, 'put', { id: req.params._id });
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

// check all attributes and build the finished object
const validateFestival = module.exports.validateFestival = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		const optionsChecked = options || {};
		const id = optionsChecked.id || '';
		const festivalEventId = optionsChecked.festivalEventId || '';
		const urlList = optionsChecked.urlList || [];

		try {
			if (!(typeof data.name == 'string' && data.name.length > 0))
				resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			if (!(data.description == undefined || typeof data.description == 'string'))
				resolve('Attribute \'description\' can be left out or has to be a string.');

			let genreList = [];
			if (!(Array.isArray(data.genre) && data.genre.length > 0 && data.genre.length < 4))
				resolve('Attribute \'genre\' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database.');
			else {
				if (
					data.genre.some(gerne => {
						if (!(typeof gerne == 'string' && gerne.length > 0)) {
							if (!(typeof gerne == 'object' && gerne._id != undefined))
								return true;
							else {
								genreList.push(gerne._id);
								return false;
							}
						}
						else {
							genreList.push(gerne);
							return false;
						}
					})
				)
					resolve('Attribute \'genre\' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database.');
			}
			const genres = await Genre.find();
			let finalGenres = [];
			if (
				genreList.some(requestGenre => {
					return !genres.some(savedGenre => {
						if (savedGenre.name == requestGenre || savedGenre._id.toString() == requestGenre) {
							finalGenres.push(savedGenre._id);
							return true;
						}
						return false;
					});
				})
			) resolve('Attribute \'genre\' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database.');

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

			if (!(typeof data.address.countryCode == 'string' && data.address.countryCode.length > 0))
				resolve('Attribute \'address.countryCode\' has to be a string with 1 or more characters.');

			if (!(data.ticketLink == undefined || typeof data.ticketLink == 'string'))
				resolve('Attribute \'ticketLink\' can be left out or has to be a string.');

			if (!(data.website == undefined || typeof data.website == 'string'))
				resolve('Attribute \'website\' can be left out or has to be a string.');

			if (!(data.facebookUrl == undefined || typeof data.facebookUrl == 'string'))
				resolve('Attribute \'facebookUrl\' can be left out or has to be a string.');

			let res = await places.search({ query: data.address.value ? data.address.value : `${data.address.street}, ${data.address.city}`, language: data.countryCode });
			if (res.hits[0] == undefined)
				res = await places.search({ query: `${data.address.street}, ${data.address.county}`, language: data.countryCode });

			let address = {
				street: '',
				city: [],
				country: []
			};
			if (res.hits[0] != undefined) {
				address.street = res.hits[0].locale_names.default[0];

				if (res.hits[0].city) {
					for (attribute in res.hits[0].city) {
						if (!address.city.includes(res.hits[0].city[attribute][0]))
							address.city.push(res.hits[0].city[attribute][0]);
					}
				}
				if (res.hits[0].county) {
					for (attribute in res.hits[0].county) {
						if (!address.city.includes(res.hits[0].county[attribute][0]))
							address.city.push(res.hits[0].county[attribute][0]);
					}
				}
				if (res.hits[0].administrative && !address.city.includes(res.hits[0].administrative[0]))
					address.city.push(res.hits[0].administrative[0]);

				if (res.hits[0].country) {
					for (attribute in res.hits[0].country) {
						if (!address.country.includes(res.hits[0].country[attribute]))
							address.country.push(res.hits[0].country[attribute]);
					}
				}
			}


			if (type == 'put' || type == 'validate') {
				const model = {
					put: Festival,
					validate: UnvalidatedFestival
				};

				const object = await model[type].findById(id);
				if (!object)
					resolve('No festival found with this ID');

				if (type == 'validate' && !object.events.includes(festivalEventId))
					resolve('Festival event ID not found in the festival\'s festival events list');

				let newFestival = {
					name: data.name,
					url: '',
					description: data.description != undefined ? data.description : object.description,
					genre: finalGenres,
					events: type == 'put' ? object.events : [],
					address: {
						default: {
							street: data.address.street,
							administrative: data.address.administrative != undefined ? data.address.administrative : object.address.administrative,
							city: data.address.city,
							county: data.address.county != undefined ? data.address.county : object.address.county,
							country: data.address.country,
							postcode: data.address.postcode != undefined ? data.address.postcode : object.address.postcode,
							lat: data.address.lat,
							lng: data.address.lng,
							value: data.address.value != undefined ? data.address.value : object.address.value,
							countryCode: data.address.countryCode
						},
						international: address
					},
					ticketLink: data.ticketLink != undefined ? data.ticketLink : object.ticketLink,
					website: data.website != undefined ? data.website : object.website,
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : object.facebookUrl
				};
				if (type == 'put') newFestival._id = id;

				const updatedObject = await url.generateUrl(newFestival, 'festival');
				resolve(updatedObject);
			}
			else {
				let newFestival = {
					name: data.name,
					url: '',
					description: data.description != undefined ? data.description : '',
					genre: finalGenres,
					events: [],
					address: {
						default: {
							street: data.address.street,
							administrative: data.address.administrative != undefined ? data.address.administrative : '',
							city: data.address.city,
							county: data.address.county != undefined ? data.address.county : '',
							country: data.address.country,
							postcode: data.address.postcode != undefined ? data.address.postcode : '',
							lat: data.address.lat,
							lng: data.address.lng,
							value: data.address.value != undefined ? data.address.value : '',
							countryCode: data.address.countryCode
						},
						international: address
					},
					ticketLink: data.ticketLink != undefined ? data.ticketLink : '',
					website: data.website != undefined ? data.website : '',
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : ''
				};
				if (type == 'unvalidated') resolve(newFestival);
				else {
					const updatedObject = await url.generateUrl(newFestival, 'festival', urlList);
					resolve(updatedObject);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}