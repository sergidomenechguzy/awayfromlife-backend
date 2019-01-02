const mongoose = require('mongoose');
const algoliasearch = require('algoliasearch');
const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load genre model
require(dirPath + '/api/models/Genre');
const Genre = mongoose.model('genres');

// load url.js
const url = require(dirPath + '/api/helpers/url');
// load image.js
const image = require(dirPath + '/api/helpers/image');

// validate all attributes for one band object in the request body
module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let options = {};
			if (type == 'put' || type == 'validate')
				options.id = req.params._id;
			if (req.file != undefined)
				options.image = req.file.path;

			const response = await validateBand(JSON.parse(req.body.data), type, options);
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

// validate all attributes for a list of band objects in the request body
module.exports.validateList = (type) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			const data = JSON.parse(req.body.data);
			for (const current of data.list) {
				const response = await validateBand(current, type, { urlList: urlList });
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
const validateBand = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		try {
			const optionsChecked = options || {};
			const id = optionsChecked.id || '';
			const urlList = optionsChecked.urlList || [];
			const imagePath = optionsChecked.image || '';

			if (!(typeof data.name == 'string' && data.name.trim().length > 0))
				resolve('Attribute \'name\' has to be a string with 1 or more characters.');

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

			if (!(typeof data.origin.city == 'string' && data.origin.city.length > 0))
				resolve('Attribute \'origin.city\' has to be a string with 1 or more characters.');

			if (!(data.origin.administrative == undefined || typeof data.origin.administrative == 'string'))
				resolve('Attribute \'origin.administrative\' can be left out or has to be a string.');

			if (!(typeof data.origin.country == 'string' && data.origin.country.length > 0))
				resolve('Attribute \'origin.country\' has to be a string with 1 or more characters.');

			if (!(data.origin.postcode == undefined || typeof data.origin.postcode == 'string'))
				resolve('Attribute \'origin.postcode\' can be left out or has to be a string.');

			if (typeof data.origin.lat != 'number')
				resolve('Attribute \'origin.lat\' has to be a number.');

			if (typeof data.origin.lng != 'number')
				resolve('Attribute \'origin.lng\' has to be a number.');

			if (!(data.origin.value == undefined || typeof data.origin.value == 'string'))
				resolve('Attribute \'origin.value\' can be left out or has to be a string.');

			if (!(typeof data.origin.countryCode == 'string' && data.origin.countryCode.length > 0))
				resolve('Attribute \'origin.countryCode\' has to be a string with 1 or more characters.');

			if (!(data.history == undefined || typeof data.history == 'string'))
				resolve('Attribute \'history\' can be left out or has to be a string.');

			if (!(data.recordLabel == undefined || typeof data.recordLabel == 'string'))
				resolve('Attribute \'recordLabel\' can be left out or has to be a string.');

			if (!(data.releases == undefined || Array.isArray(data.releases)))
				resolve('Attribute \'releases\' has to be an array of objects with the attributes \'releaseName\' and \'releaseYear\'.');
			if (
				data.releases != undefined
				&&
				data.releases.some(release => {
					if (release.releaseName == undefined || release.releaseYear == undefined) return true;
					return false;
				})
			) resolve('Attribute \'releases\' has to be an array of objects each with the attributes \'releaseName\' and \'releaseYear\'.');

			if (!(data.foundingDate == undefined || typeof data.foundingDate == 'string'))
				resolve('Attribute \'foundingDate\' can be left out or has to be a string.');

			if (!(data.website == undefined || typeof data.website == 'string'))
				resolve('Attribute \'website\' can be left out or has to be a string.');

			if (!(data.bandcampUrl == undefined || typeof data.bandcampUrl == 'string'))
				resolve('Attribute \'bandcampUrl\' can be left out or has to be a string.');

			if (!(data.soundcloudUrl == undefined || typeof data.soundcloudUrl == 'string'))
				resolve('Attribute \'soundcloudUrl\' can be left out or has to be a string.');

			if (!(data.facebookUrl == undefined || typeof data.facebookUrl == 'string'))
				resolve('Attribute \'facebookUrl\' can be left out or has to be a string.');

			let res = await places.search({ query: data.origin.value ? data.origin.value : `${data.origin.city}, ${data.origin.country}`, language: data.countryCode, type: 'city' });

			let origin = {
				city: [],
				country: []
			};
			if (res.hits[0] != undefined) {
				if (res.hits[0].locale_names) {
					for (attribute in res.hits[0].locale_names) {
						res.hits[0].locale_names[attribute].forEach(value => {
							if (!origin.city.includes(value))
								origin.city.push(value);
						});
					}
				}
				if (res.hits[0].county) {
					for (attribute in res.hits[0].county) {
						res.hits[0].county[attribute].forEach(value => {
							if (!origin.city.includes(value))
								origin.city.push(value);
						});
					}
				}
				if (res.hits[0].administrative) {
					res.hits[0].administrative.forEach(value => {
						if (!origin.city.includes(value))
							origin.city.push(value);
					});
				}

				if (res.hits[0].country) {
					for (attribute in res.hits[0].country) {
						if (!origin.country.includes(res.hits[0].country[attribute]))
							origin.country.push(res.hits[0].country[attribute]);
					}
				}
			}

			let imageList = [];
			if (imagePath.length > 0)
				imageList = await image.saveImages(imagePath);
			else if (type == 'post' || type == 'unvalidated' || data.image.length == 0)
				imageList = image.randomPlaceholder();


			if (type == 'put' || type == 'validate') {
				const model = {
					put: Band,
					validate: UnvalidatedBand
				};
				const object = await model[type].findById(id);
				if (!object)
					resolve('No band found with this ID');

				if (imageList.length > 0)
					await image.deleteImages(object.image);

				let newBand = {
					name: data.name.trim(),
					url: '',
					genre: finalGenres,
					origin: {
						default: {
							city: data.origin.city,
							administrative: data.origin.administrative != undefined ? data.origin.administrative : object.origin.administrative,
							country: data.origin.country,
							postcode: data.origin.postcode != undefined ? data.origin.postcode : object.origin.postcode,
							lat: data.origin.lat,
							lng: data.origin.lng,
							value: data.origin.value != undefined ? data.origin.value : object.origin.value,
							countryCode: data.origin.countryCode
						},
						international: origin
					},
					history: data.history != undefined ? data.history : object.history,
					recordLabel: data.recordLabel != undefined ? data.recordLabel : object.recordLabel,
					releases: data.releases != undefined ? data.releases : object.releases,
					foundingDate: data.foundingDate != undefined ? data.foundingDate : object.foundingDate,
					website: data.website != undefined ? data.website : object.website,
					bandcampUrl: data.bandcampUrl != undefined ? data.bandcampUrl : object.bandcampUrl,
					soundcloudUrl: data.soundcloudUrl != undefined ? data.soundcloudUrl : object.soundcloudUrl,
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : object.facebookUrl,
					image: imageList.length > 0 ? imageList : object.image
				};
				if (type == 'put') newBand._id = id;
				const updatedObject = await url.generateUrl(newBand, 'band');
				resolve(updatedObject);
			}
			else {
				let newBand = {
					name: data.name.trim(),
					url: '',
					genre: finalGenres,
					origin: {
						default: {
							city: data.origin.city,
							administrative: data.origin.administrative != undefined ? data.origin.administrative : '',
							country: data.origin.country,
							postcode: data.origin.postcode != undefined ? data.origin.postcode : '',
							lat: data.origin.lat,
							lng: data.origin.lng,
							value: data.origin.value != undefined ? data.origin.value : '',
							countryCode: data.origin.countryCode
						},
						international: origin
					},
					history: data.history != undefined ? data.history : '',
					recordLabel: data.recordLabel != undefined ? data.recordLabel : '',
					releases: data.releases != undefined ? data.releases : [],
					foundingDate: data.foundingDate != undefined ? data.foundingDate : '',
					website: data.website != undefined ? data.website : '',
					bandcampUrl: data.bandcampUrl != undefined ? data.bandcampUrl : '',
					soundcloudUrl: data.soundcloudUrl != undefined ? data.soundcloudUrl : '',
					facebookUrl: data.facebookUrl != undefined ? data.facebookUrl : '',
					image: imageList
				};
				if (type == 'unvalidated') resolve(newBand);
				else {
					const updatedObject = await url.generateUrl(newBand, 'band', urlList);
					resolve(updatedObject);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}