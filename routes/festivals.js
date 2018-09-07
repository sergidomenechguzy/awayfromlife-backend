const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load url.js
const url = require('../config/url');

// festivals routes
// get all festivals
router.get('/', token.checkToken(false), (req, res) => {
	Festival.find()
		.then(festivals => {
			if (festivals.length === 0) 
				return res.status(200).json({ message: 'No festivals found', token: res.locals.token });
			
			dereference.festivalObjectArray(festivals, 'title', 1, (err, responseFestivals) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseFestivals, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get festival by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	Festival.findOne({ _id: req.params._id })
		.then(festival => {
			if (!festival) 
				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			
			dereference.festivalObject(festival, (err, responseFestival) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseFestival, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post festival to database
router.post('/', token.checkToken(true), params.checkParameters(['title', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
	const newFestival = {
		title: req.body.title,
		url: '',
		description: req.body.description,
		events: req.body.events,
		address: {
			street: req.body.address.street,
			administrative: req.body.address.administrative,
			city: req.body.address.city,
			county: req.body.address.county,
			country: req.body.address.country,
			postcode: req.body.address.postcode,
			lat: req.body.address.lat,
			lng: req.body.address.lng,
			value: req.body.address.value
		},
		ticketLink: req.body.ticketLink,
		website: req.body.website,
		facebookUrl: req.body.facebookUrl,
	};

	url.generateUrl(newFestival, Festival,(err, responseFestival) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		new Festival(responseFestival)
			.save()
			.then(() => {
				return res.status(200).json({ message: 'Festival saved', token: res.locals.token });
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// // update festival by id
// router.put('/:_id', token.checkToken(true), params.checkParameters(['title', 'startDate', 'endDate']), (req, res) => {
// 	Festival.findOne({ _id: req.params._id })
// 		.then(festival => {
// 			if (!festival) 
// 				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
				
// 			const update = {
// 				_id: req.params._id,
// 				title: req.body.title,
// 				startDate: req.body.startDate,
// 				endDate: req.body.endDate,
// 				bands: req.body.bands ? req.body.bands : festival.bands,
// 				canceled: req.body.canceled ? req.body.canceled : festival.canceled
// 			};

// 			Festival.findOneAndUpdate({ _id: req.params._id }, update, (err, festival) => {
// 				if (err) {
// 					console.log(err.name + ': ' + err.message);
// 					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 				}
// 				return res.status(200).json({ message: 'Event updated', token: res.locals.token });
// 			});
// 		})
// 		.catch(err => {
// 			console.log(err.name + ': ' + err.message);
// 			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 		});
// });

// // delete festival by id
// router.delete('/:_id', token.checkToken(true), (req, res) => {
// 	Festival.findOne({ _id: req.params._id })
// 		.then(festival => {
// 			if (!festival) 
// 				return res.status(400).json({ message: 'No festival found with this ID', token: res.locals.token });
			
// 			Festival.remove({ _id: req.params._id }, (err, festival) => {
// 				if (err) {
// 					console.log(err.name + ': ' + err.message);
// 					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 				}
// 				return res.status(200).json({ message: 'Event deleted', token: res.locals.token });
// 			});
// 		})
// 		.catch(err => {
// 			console.log(err.name + ': ' + err.message);
// 			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
// 		});
// });

module.exports = router;