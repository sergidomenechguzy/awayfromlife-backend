const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

function events() {
	return new Promise(async (resolve, reject) => {
		try {
			let archiveEvents = [];
			const events = await Event.find();
			events.forEach(event => {
				if (Math.floor(moment(event.date).valueOf() / 86400000) <= Math.floor((Date.now() / 86400000) - 1))
					archiveEvents.push(event);
			});
			if (archiveEvents.length === 0) resolve(archiveEvents);

			const promises = archiveEvents.map(async (object) => {
				await Event.remove({ _id: object._id });
				const newEvent = {
					name: object.name,
					url: object.url,
					description: object.description,
					location: object.location,
					date: object.date,
					time: object.time,
					bands: object.bands,
					canceled: object.canceled,
					ticketLink: object.ticketLink,
					verifiable: object.verifiable
				};
				const saved = await new ArchivedEvent(newEvent).save();
				return saved;
			});
			const objectList = await Promise.all(promises);
			resolve(objectList);
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	events: events
};