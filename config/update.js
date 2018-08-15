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
	let update = {
		_id: event._id,
		title: event.title,
		url: event.title.split(' ').join('-'),
		description: event.description ? event.description : '',
		location: event.location,
		startDate: event.startDate,
		bands: (event.bands.length > 0) ? event.bands : [],
		canceled: event.canceled,
		ticketLink: event.ticketLink ? event.ticketLink : '',
		lastModified: Date.now()
	};
	
	url.generateEventUrl(update, 'event', event.title.split(' ').join('-'), 2, (err, responseEvent) => {
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
	let update = {
		_id: event._id,
		title: event.title,
		url: event.title.split(' ').join('-'),
		description: event.description ? event.description : '',
		location: event.location,
		startDate: event.startDate,
		bands: (event.bands.length > 0) ? event.bands : [],
		canceled: event.canceled,
		ticketLink: event.ticketLink ? event.ticketLink : '',
		lastModified: Date.now()
	};
	
	url.generateEventUrl(update, 'archive', event.title.split(' ').join('-'), 2, (err, responseEvent) => {
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
	let update = {
		_id: location._id,
		name: location.name,
		url: location.name.split(' ').join('-'),
		address: {
			street: location.address.street,
			administrative: location.address.administrative ? location.address.administrative : '',
			city: location.address.city,
			county: location.address.county ? location.address.county : '',
			country: location.address.country,
			postcode: location.address.postcode ? location.address.postcode : '',
			lat: location.address.lat,
			lng: location.address.lng,
			value: location.address.value ? location.address.value : ''
		},
		status: location.status,
		information: location.information ? location.information : '',
		website: location.website ? location.website : '',
		facebookUrl: location.facebookUrl ? location.facebookUrl : ''
	};
	
	url.generateUrl(update, Location, location.name.split(' ').join('-'), 2, (err, responseLocation) => {
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
	let update = {
		_id: band._id,
		name: band.name,
		url: band.name.split(' ').join('-'),
		genre: band.genre,
		origin: {
			name: band.origin.name,
			administrative: band.origin.administrative ? band.origin.administrative : '',
			country: band.origin.country,
			postcode: band.origin.postcode ? band.origin.postcode : '',
			lat: band.origin.lat,
			lng: band.origin.lng,
			value: band.origin.value ? band.origin.value : ''
		},
		history: band.history ? band.history : '',
		recordLabel: band.recordLabel ? band.recordLabel : '',
		releases: (band.releases.length > 0) ? band.releases : [],
		foundingDate: band.foundingDate ? band.foundingDate : '',
		websiteUrl: band.websiteUrl ? band.websiteUrl : '',
		bandcampUrl: band.bandcampUrl ? band.bandcampUrl : '',
		soundcloudUrl: band.soundcloudUrl ? band.soundcloudUrl : '',
		facebookUrl: band.facebookUrl ? band.facebookUrl : ''
	};
	
	url.generateUrl(update, Band, band.name.split(' ').join('-'), 2, (err, responseBand) => {
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