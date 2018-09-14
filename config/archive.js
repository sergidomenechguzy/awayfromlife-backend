const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

module.exports.events = (next) => {
	let archiveEvents = [];
	let counter = 0;
	Event.find()
		.then(events => {
			events.forEach(event => {
				if (Math.floor(moment(event.date).valueOf() / 86400000) <= Math.floor((Date.now() / 86400000) - 1)) 
					archiveEvents.push(event);
			});
			if (archiveEvents.length === 0) next(null, archiveEvents);

			archiveEvents.forEach((archiveEvent, index, array) => {
				Event.remove({ _id: archiveEvent._id }, (err, event) => {
					if (err) next(err, null);

					const newEvent = {
						title: archiveEvent.title,
						url: archiveEvent.url,
						description: archiveEvent.description,
						location: archiveEvent.location,
						date: archiveEvent.date,
						time: archiveEvent.time,
						bands: archiveEvent.bands,
						canceled: archiveEvent.canceled,
						ticketLink: archiveEvent.ticketLink
					};

					new ArchivedEvent(newEvent)
						.save()
						.then(() => {
							counter++;
							if (counter === array.length) next(null, archiveEvents);
						})
						.catch(err => {
							next(err, null);
						});
				});
			});
		})
		.catch(err => {
			next(err, null);
		});
};