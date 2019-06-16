const mongoose = require('mongoose');
const algoliasearch = require('algoliasearch');
const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load url.js
const url = require(dirPath + '/api/helpers/url');
// load image.js
const image = require(dirPath + '/api/helpers/image');

// validate all attributes for one location object in the request body
module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let options = {};
			if (type == 'put' || type == 'validate')
				options.id = req.params._id;
			if (req.file != undefined)
				options.image = req.file.path;

			const response = await validateLocation(JSON.parse(req.body.data), type, options);
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

// validate all attributes for a list of location objects in the request body
module.exports.validateList = (type) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			const data = JSON.parse(req.body.data);
			for (const current of data.list) {
				const response = await validateLocation(current, type, { urlList: urlList });
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
const validateLocation = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		try {
			const optionsChecked = options || {};
			const id = optionsChecked.id || '';
			const urlList = optionsChecked.urlList || [];
			const imagePath = optionsChecked.image || '';

			if (!(typeof data.name == 'string' && data.name.trim().length > 0))
				return resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			if (!(typeof data.address.street == 'string' && data.address.street.length > 0))
				return resolve('Attribute \'address.street\' has to be a string with 1 or more characters.');

			if (!(data.address.administrative == undefined || typeof data.address.administrative == 'string'))
				return resolve('Attribute \'address.administrative\' can be left out or has to be a string.');

			if (!(typeof data.address.city == 'string' && data.address.city.length > 0))
				return resolve('Attribute \'address.city\' has to be a string with 1 or more characters.');

			if (!(data.address.county == undefined || typeof data.address.county == 'string'))
				return resolve('Attribute \'address.county\' can be left out or has to be a string.');

			if (!(typeof data.address.country == 'string' && data.address.country.length > 0))
				return resolve('Attribute \'address.country\' has to be a string with 1 or more characters.');

			if (!(data.address.postcode == undefined || typeof data.address.postcode == 'string'))
				return resolve('Attribute \'address.postcode\' can be left out or has to be a string.');

			if (typeof data.address.lat != 'number')
				return resolve('Attribute \'address.lat\' has to be a number.');

			if (typeof data.address.lng != 'number')
				return resolve('Attribute \'address.lng\' has to be a number.');

			if (!(data.address.value == undefined || typeof data.address.value == 'string'))
				return resolve('Attribute \'address.value\' can be left out or has to be a string.');

			if (!(typeof data.address.countryCode == 'string' && data.address.countryCode.length > 0))
				return resolve('Attribute \'address.countryCode\' has to be a string with 1 or more characters.');

			if (!(data.status == undefined || (typeof data.status == 'string' && (data.status == 'opened' || data.status == 'closed'))))
				return resolve('Attribute \'status\' can be left out or has to be either \'opened\' or \'closed\' as a string.');

			if (!(data.information == undefined || typeof data.information == 'string'))
				return resolve('Attribute \'information\' can be left out or has to be a string.');

			if (!(data.website == undefined || typeof data.website == 'string'))
				return resolve('Attribute \'website\' can be left out or has to be a string.');

			if (!(data.facebookUrl == undefined || typeof data.facebookUrl == 'string'))
				return resolve('Attribute \'facebookUrl\' can be left out or has to be a string.');


			let res = await places.search({ query: data.address.value ? data.address.value : `${data.address.street}, ${data.address.city}`, language: data.countryCode, type: 'address' });
			if (res.hits[0] == undefined)
				res = await places.search({ query: `${data.address.street}, ${data.address.county}`, language: data.countryCode, type: 'address' });

			let address = {
				street: '',
				city: [],
				country: []
			};
			if (res.hits[0] != undefined) {
				address.street = res.hits[0].locale_names.default[0];

				if (res.hits[0].city) {
					for (attribute in res.hits[0].city) {
						res.hits[0].city[attribute].forEach(value => {
							if (!address.city.includes(value))
								address.city.push(value);
						});
					}
				}
				if (res.hits[0].county) {
					for (attribute in res.hits[0].county) {
						res.hits[0].county[attribute].forEach(value => {
							if (!address.city.includes(value))
								address.city.push(value);
						});
					}
				}
				if (res.hits[0].administrative) {
					res.hits[0].administrative.forEach(value => {
						if (!address.city.includes(value))
							address.city.push(value);
					});
				}

				if (res.hits[0].country) {
					for (attribute in res.hits[0].country) {
						if (!address.country.includes(res.hits[0].country[attribute]))
							address.country.push(res.hits[0].country[attribute]);
					}
				}
			}

			let imageList = [];
			if (imagePath.length > 0)
				imageList = await image.saveImages(imagePath, 'locations');
			else if (type == 'post' || type == 'unvalidated' || !data.image || data.image.length == 0)
				imageList = image.randomPlaceholder();

			if (!(data.imageSource.text == undefined || typeof data.imageSource.text == 'string'))
				return resolve('Attribute \'imageSource.text\' can be left out or has to be a string.');

			if (!(data.imageSource.url == undefined || typeof data.imageSource.url == 'string'))
				return resolve('Attribute \'imageSource.url\' can be left out or has to be a string.');


			if (type == 'put' || type == 'validate') {
				const model = {
					put: Location,
					validate: UnvalidatedLocation
				};
				const object = await model[type].findById(id);
				if (!object)
					return resolve('No location found with this ID');

				if (imageList.length > 0)
					await image.deleteImages(object.image);

				let newLocation = {
					name: data.name.trim(),
					url: '',
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
					status: data.status != undefined ? data.status : object.status,
					information: data.information != undefined ? data.information : object.information,
					website: data.website != undefined ? data.website : object.website,
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : object.facebookUrl,
					image: imageList.length > 0 ? imageList : object.image,
					imageSource: {
						text: data.imageSource && data.imageSource.text != undefined ? data.imageSource.text : object.imageSource.text,
						url: data.imageSource && data.imageSource.url != undefined ? data.imageSource.url : object.imageSource.url,
					},
					lastModified: Date.now(),
				};
				if (type == 'put') newLocation._id = id;
				const updatedObject = await url.generateUrl(newLocation, 'location');
				return resolve(updatedObject);
			}
			else {
				let newLocation = {
					name: data.name.trim(),
					url: '',
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
					status: data.status != undefined ? data.status : 'opened',
					information: data.information != undefined ? data.information : '',
					website: data.website != undefined ? data.website : '',
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : '',
					image: imageList,
					imageSource: {
						text: data.imageSource && data.imageSource.text != undefined ? data.imageSource.text : '',
						url: data.imageSource && data.imageSource.url != undefined ? data.imageSource.url : '',
					},
				};
				if (type == 'unvalidated') return resolve(newLocation);
				else {
					const updatedObject = await url.generateUrl(newLocation, 'location', urlList);
					return resolve(updatedObject);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}