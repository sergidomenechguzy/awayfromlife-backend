const mongoose = require('mongoose');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// validate all attributes for one genre object in the request body
module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let response;
			if (type == 'put') response = await validateGenre(req.body, type, { id: req.params._id });
			else response = await validateGenre(req.body, type);
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

// validate all attributes for a list of genre objects in the request body
module.exports.validateList = () => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let nameList = [];
			for (const current of req.body.list) {
				const response = await validateGenre(current, 'multiple', { nameList: nameList });
				if (typeof response == 'string') return res.status(400).json({ message: response, token: res.locals.token });
				responseList.push(response);
				nameList.push(response.name.toLowerCase());
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
const validateGenre = (data, type, options) => {
	return new Promise(async (resolve, reject) => {
		const optionsChecked = options || {};
		const id = optionsChecked.id || '';
		const nameList = optionsChecked.nameList || [];

		try {
			if (!(typeof data.name == 'string' && data.name.length > 0))
				resolve('Attribute \'name\' has to be a string with 1 or more characters.');

			const genres = await Genre.find();
			const genreNames = genres.map(genre => genre.name.toLowerCase());
			if (type == 'put') {
				const object = await Genre.findById(id);
				if (!object) resolve('No genre found with this ID');

				let index = genreNames.indexOf(data.name.toLowerCase());
				if (index < 0 || genres[index]._id.toString() == id) {
					let newGenre = {
						_id: id,
						name: data.name
					};
					resolve(newGenre);
				}
				else resolve('A genre with this name already exists.');
			}
			else {
				if (genreNames.includes(data.name.toLowerCase())) 
					resolve(type == 'multiple' ? 'At least one genre already exists.' : 'A genre with this name already exists.');
				else if (nameList.includes(data.name.toLowerCase()))
					resolve('All the names of the genres have to be different.');

				let newGenre = {
					name: data.name
				};
				resolve(newGenre);
			}
		}
		catch (err) {
			reject(err);
		}
	});
}