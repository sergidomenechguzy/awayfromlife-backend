const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load report model
require('../models/Report');
const Report = mongoose.model('reports');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load dereference.js
const dereference = require('../config/dereference');

// reports routes
// get all reports
router.get('/', token.checkToken(true), (req, res) => {
	Report.find()
		.then(reports => {
			if (reports.length === 0) 
				return res.status(200).json({ message: 'No reports found', token: res.locals.token });
			
			dereference.reportObjectArray(reports, 1, (err, responseReports) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseReports, token: res.locals.token });
			});
			// return res.status(200).json({ data: reports, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post report to database
router.post('/', token.checkToken(false), params.checkParameters(['category', 'item']), (req, res) => {
	if (req.body.category != 'event' && req.body.category != 'location' && req.body.category != 'band')
		return res.status(400).json({ message: 'Only event, location or band allowed as category.' });

	const categories = {
		event: Event,
		location: Location,
		band: Band
	}
	
	categories[req.body.category].findOne({ _id: req.body.item })
		.then(item => {
			if (!item) return res.status(200).json({ message: 'No item found with this ID in the specified category', token: res.locals.token });

			const newReport = {
				category: req.body.category,
				item: req.body.item,
				description: req.body.description
			};
			new Report(newReport)
				.save()
				.then(() => {
					return res.status(200).json({ message: 'Report saved', token: res.locals.token })
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete report by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Report.findOne({ _id: req.params._id })
		.then(report => {
			if (!report) 
				return res.status(400).json({ message: 'No report found with this ID', token: res.locals.token });
			Report.remove({ _id: req.params._id }, (err, report) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Report deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
