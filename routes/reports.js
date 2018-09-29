const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load report model
require('../models/Report');
const Report = mongoose.model('reports');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateReport.js
const validateReport = require('../helpers/validateReport');

// reports routes
// get all reports
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const reports = await Report.find();
		if (reports.length === 0) 
			return res.status(200).json({ message: 'No reports found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(reports, 'report', '', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});


// post report to database
router.post('/', token.checkToken(false), params.checkParameters(['category', 'item']), validateReport.validateObject(), (req, res) => {
	new Report(res.locals.validated)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Report saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete report by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Report.findById(req.params._id)
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

// delete report and reported item by report id
router.delete('/accept/:_id', token.checkToken(true), (req, res) => {
	Report.findById(req.params._id)
		.then(report => {
			if (!report) 
				return res.status(400).json({ message: 'No report found with this ID', token: res.locals.token });
			
			const categories = {
				event: 'validEvent',
				location: 'validLocation',
				band: 'validBand',
				festival: 'validFestival'
			};
			deleteRoute.delete(report.item, categories[report.category], (err, response) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				if (response.status == 200)
					return res.status(200).json({ message: 'Report and ' + report.category + ' deleted', token: res.locals.token });
				return res.status(response.status).json({ message: response.message, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
