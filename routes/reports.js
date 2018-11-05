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
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post report to database
router.post('/', token.checkToken(false), params.checkParameters(['category', 'item']), validateReport.validateObject(), async (req, res) => {
	try {
		await new Report(res.locals.validated).save();
		return res.status(200).json({ message: 'Report saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete report and reported item by report id
router.post('/accept/:_id', token.checkToken(true), async (req, res) => {
	const categories = {
		event: 'validEvent',
		location: 'validLocation',
		band: 'validBand',
		festival: 'validFestival'
	};

	try {
		const report = await Report.findById(req.params._id);
		if (!report)
			return res.status(400).json({ message: 'No report found with this ID', token: res.locals.token });

		const response = await deleteRoute.delete(report.item, categories[report.category]);
		if (response.status == 200)
			return res.status(response.status).json({ message: 'Report and ' + report.category + ' deleted', token: res.locals.token });
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete report by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'report');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;
