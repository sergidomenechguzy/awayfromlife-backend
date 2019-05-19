const express = require('express');
const router = express.Router();

// load latest.js
const latest = require(dirPath + '/api/routes/controller/latest');
// load token.js
const token = require(dirPath + '/api/helpers/token');

// get latest added events
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let allCategories = ['event', 'archivedEvent', 'location', 'band', 'festival', 'festivalEvent', 'genre'];
		if (res.locals.token != undefined)
			allCategories = allCategories.concat(['unvalidatedEvent', 'unvalidatedLocation', 'unvalidatedBand', 'unvalidatedFestival', 'unvalidatedFestivalEvent', 'bug', 'feedback', 'report']);
		
		let categories = ['event', 'location', 'band', 'festivalEvent'];
		if (req.query.categories != undefined) {
			let queryCategories = req.query.categories.split('_');
			let finalCategories = [];
			queryCategories.forEach(category => {
				if (allCategories.includes(category)) {
					if (!finalCategories.includes(category)) finalCategories.push(category);
				}
				else {
					return res.status(400).json({ message: `Only '${allCategories.join(`', '`)}' allowed as categories.`, token: res.locals.token });
				}
			});
			if (finalCategories.length > 0) categories = finalCategories;
		}

		let count = 5;
		if (parseInt(req.query.count)) count = parseInt(req.query.count);

		const latestObjects = await latest.getMultiple(categories, count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});


const update = require(dirPath + '/api/helpers/update');
router.get('/update', async (req, res) => {
	try {
		const updated = await update.updateMultiple();
		return res.status(200).json({ data: updated, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;