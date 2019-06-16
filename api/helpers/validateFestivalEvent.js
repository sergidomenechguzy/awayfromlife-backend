const mongoose = require('mongoose');
const moment = require('moment');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load festival event model
require(dirPath + '/api/models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

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

			const response = await validateFestivalEvent(JSON.parse(req.body.data), type, options);
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
module.exports.validateList = () => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			for (const current of req.body.list) {
				const response = await validateFestivalEvent(current, 'multiple');
				if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
				responseList.push(response);
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
const validateFestivalEvent = module.exports.validateFestivalEvent = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		try {
			const optionsChecked = options || {};
			const id = optionsChecked.id || '';
			const imagePath = optionsChecked.image || '';

			let verifiable = true;

			if (!(typeof data.name == 'string' && data.name.trim().length > 0))
				return resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			if (!(data.description == undefined || typeof data.description == 'string'))
				return resolve('Attribute \'description\' can be left out or has to be a string.');

			let finalStartDate;
			if (!(typeof data.startDate == 'string' && data.startDate.length > 0 && moment(data.startDate, 'YYYY-MM-DD', true).isValid()))
				return resolve('Attribute \'startDate\' has to be a string in the \'YYYY-MM-DD\' date format.');
			else
				finalStartDate = new Date(data.startDate);

			let finalEndDate;
			if (!(typeof data.endDate == 'string' && data.endDate.length > 0 && moment(data.endDate, 'YYYY-MM-DD', true).isValid()))
				return resolve('Attribute \'endDate\' has to be a string in the \'YYYY-MM-DD\' date format.');
			else
				finalEndDate = new Date(data.endDate);

			let bandList = [];
			if (!(Array.isArray(data.bands) && data.bands.length > 0))
				return resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');
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
					return resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');
			}
			const bands = await Band.find();
			const bandIds = bands.map(band => band._id.toString());
			const unvalidatedBands = await UnvalidatedBand.find();
			const unvalidatedBandIds = unvalidatedBands.map(band => band._id.toString());
			if (
				bandList.some(band => {
					if (!bandIds.includes(band)) {
						if (unvalidatedBandIds.includes(band)) {
							verifiable = false;
							return false;
						}
						return true;
					}
					return false;
				})
			) return resolve('Attribute \'bands\' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty.');

			if (!(data.canceled == undefined || (typeof data.canceled == 'number' && (data.canceled == 0 || data.canceled == 1 || data.canceled == 2))))
				return resolve('Attribute \'canceled\' can be left out or has to be either \'0\', \'1\' or \'2\' as a number.');

			let imageList = [];
			if (imagePath.length > 0) {
				if (Array.isArray(imagePath)) imageList = imagePath;
				else imageList = await image.saveImages(imagePath, 'festival-events');
			}
			else if (type == 'post' || type == 'unvalidated' || !data.image || data.image.length == 0)
				imageList = image.randomPlaceholder();

			if (!(data.imageSource.text == undefined || typeof data.imageSource.text == 'string'))
				return resolve('Attribute \'imageSource.text\' can be left out or has to be a string.');

			if (!(data.imageSource.url == undefined || typeof data.imageSource.url == 'string'))
				return resolve('Attribute \'imageSource.url\' can be left out or has to be a string.');


			if (type == 'put' || type == 'validate') {
				const model = {
					put: FestivalEvent,
					validate: UnvalidatedFestivalEvent
				};

				const object = await model[type].findById(id);
				if (!object)
					return resolve('No festival event found with this ID');

				if (imageList.length > 0)
					await image.deleteImages(object.image);

				let newFestivalEvent = {
					name: data.name.trim(),
					description: data.description != undefined ? data.description : object.description,
					startDate: finalStartDate,
					endDate: finalEndDate,
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : object.canceled,
					verifiable: verifiable,
					image: imageList.length > 0 ? imageList : object.image,
					imageSource: {
						text: data.imageSource && data.imageSource.text != undefined ? data.imageSource.text : object.imageSource.text,
						url: data.imageSource && data.imageSource.url != undefined ? data.imageSource.url : object.imageSource.url,
					},
					lastModified: Date.now(),
				};
				if (type == 'put') newFestivalEvent._id = id;
				return resolve(newFestivalEvent);
			}
			else {
				let newFestivalEvent = {
					name: data.name.trim(),
					description: data.description != undefined ? data.description : '',
					startDate: finalStartDate,
					endDate: finalEndDate,
					bands: bandList,
					canceled: data.canceled != undefined ? data.canceled : 0,
					verifiable: verifiable,
					image: imageList,
					imageSource: {
						text: data.imageSource && data.imageSource.text != undefined ? data.imageSource.text : '',
						url: data.imageSource && data.imageSource.url != undefined ? data.imageSource.url : '',
					},
				};
				return resolve(newFestivalEvent);
			}
		}
		catch (err) {
			reject(err);
		}
	});
}