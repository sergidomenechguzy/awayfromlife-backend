const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// validate all attributes for report objects in the request body
module.exports.validateObject = () => {
	return async (req, res, next) => {
		try {
			if (
				!(
					(req.body.category.toLowerCase() == 'event')
					||
					(req.body.category.toLowerCase() == 'location')
					||
					(req.body.category.toLowerCase() == 'band')
					||
					(req.body.category.toLowerCase() == 'festival')
				)
			) return res.status(400).json({ message: 'Attribute \'category\' has to be either \'event\', \'location\', \'band\' or \'festival\' as a string.', token: res.locals.token });

			let itemId;
			if (!(typeof req.body.item == 'string' && req.body.item.length > 0)) {
				if (!(typeof req.body.item == 'object' && req.body.item._id != undefined))
					return res.status(400).json({ message: 'Attribute \'item\' has to be either the ID of one item from the specified category from the database or an object from the specified category with an _id attribute containing the ID of an item from the specified category from the database.', token: res.locals.token });
				else itemId = req.body.item._id;
			}
			else itemId = req.body.item;

			if (!(req.body.description == undefined || typeof req.body.description == 'string'))
				return res.status(400).json({ message: 'Attribute \'description\' can be left out or has to be a string.', token: res.locals.token });

			const categories = {
				event: Event,
				location: Location,
				band: Band,
				festival: Festival
			};

			const item = await categories[req.body.category.toLowerCase()].findById(itemId);
			if (!item) return res.status(200).json({ message: `No ${req.body.category.toLowerCase()} found with this ID.`, token: res.locals.token });

			let newReport = {
				category: req.body.category.toLowerCase(),
				item: itemId,
				description: req.body.description != undefined ? req.body.description : ''
			};
			res.locals.validated = newReport;
			return next();
		}
		catch (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
	}
}