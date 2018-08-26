const mongoose = require('mongoose');

// load location model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load url.js
const url = require('../config/url');

module.exports.updateEvents = () => {
	Event.find()
		.then(events => {
			itEvents(events);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
}

const itEvents = (events) => {
	if (events.length == 0) return true;
	const event = events[0];
	let update = JSON.parse(JSON.stringify(event));
	update.lastModified = Date.now();
	
	url.generateEventUrl(update, 'event', (err, responseEvent) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
		}
		Event.findOneAndUpdate({ _id: event._id }, responseEvent, (err, updatedEvent) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
			}
			console.log(updatedEvent.title + ' updated');
			let newEvents = events;
			newEvents.splice(0, 1);
	
			if (itEvents(newEvents)) return true;
		});
	});
}

module.exports.updateArchivedEvents = () => {
	ArchivedEvent.find()
		.then(events => {
			itArchEvents(events);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
}

const itArchEvents = (events) => {
	if (events.length == 0) return true;
	const event = events[0];
	let update = JSON.parse(JSON.stringify(event));
	update.lastModified = Date.now();
	
	url.generateEventUrl(update, 'archive', (err, responseEvent) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
		}
		ArchivedEvent.findOneAndUpdate({ _id: event._id }, responseEvent, (err, updatedEvent) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
			}
			console.log(updatedEvent.title + ' updated');
			let newEvents = events;
			newEvents.splice(0, 1);
	
			if (itArchEvents(newEvents)) return true;
		});
	});
}

module.exports.updateLocations = () => {
	Location.find()
		.then(locations => {
			itLocations(locations);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
}

const itLocations = (locations) => {
	if (locations.length == 0) return true;
	const location = locations[0];
	let update = JSON.parse(JSON.stringify(location));
	
	url.generateUrl(update, Location, (err, responseLocation) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
		}
		Location.findOneAndUpdate({ _id: location._id }, responseLocation, (err, updatedLocation) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
			}
			console.log(updatedLocation.name + ' updated');
			let newLocations = locations;
			newLocations.splice(0, 1);
	
			if (itLocations(newLocations)) return true;
		});
	});
}

module.exports.updateBands = () => {
	Band.find()
		.then(bands => {
			itBands(bands);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
}

const itBands = (bands) => {
	if (bands.length == 0) return true;
	const band = bands[0];
	let update = JSON.parse(JSON.stringify(band));
	
	url.generateUrl(update, Band, (err, responseBand) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
		}
		Band.findOneAndUpdate({ _id: band._id }, responseBand, (err, updatedBand) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
			}
			console.log(updatedBand.name + ' updated');
			let newBands = bands;
			newBands.splice(0, 1);
	
			if (itBands(newBands)) return true;
		});
	});
}