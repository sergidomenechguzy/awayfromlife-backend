const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateReport = require('../helpers/validateReport');
const rateLimit = require('../config/rateLimit');
require('../models/Report');

const router = express.Router();

const Report = mongoose.model('reports');

// reports routes
// get all reports
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const reports = await Report.find();
    if (reports.length === 0) {
      return res.status(200).json({ message: 'No reports found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(reports, 'report', '', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added reports
router.get('/latest', token.checkToken(true), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('report', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post report to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  validateReport.validateObject(),
  async (req, res) => {
    try {
      await new Report(res.locals.validated).save();
      return res.status(200).json({ message: 'Report saved', token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete report and reported item by report id
router.post('/accept/:_id', token.checkToken(true), async (req, res) => {
  try {
    const report = await Report.findById(req.params._id);
    if (!report) {
      return res
        .status(400)
        .json({ message: 'No report found with this ID', token: res.locals.token });
    }

    const response = await deleteRoute.deleteObject(report.item, report.category);
    if (response.status === 200) {
      return res
        .status(response.status)
        .json({ message: `Report and ${report.category} deleted`, token: res.locals.token });
    }
    return res.status(response.status).json({ message: response.message, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// delete report by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'report');
    return res.status(response.status).json({ message: response.message, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
