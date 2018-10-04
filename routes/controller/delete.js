const mongoose = require('mongoose');

// load event model
require('../../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require('../../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load location model
require('../../models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load festival model
require('../../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load festival event model
require('../../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// load report model
require('../../models/Report');
const Report = mongoose.model('reports');

// delete object by id from specified collection and delete or update all connected objects
module.exports.delete = (id, collection, next) => {
	const categories = {
		validEvent: { model: Event, string: 'Event' },
		archiveEvent: { model: ArchivedEvent, string: 'Event' },
		unvalidEvent: { model: UnvalidatedEvent, string: 'Event' },
		validLocation: { model: Location, string: 'Location' },
		unvalidLocation: { model: UnvalidatedLocation, string: 'Location' },
		validBand: { model: Band, string: 'Band' },
		unvalidBand: { model: UnvalidatedBand, string: 'Band' },
		validFestival: { model: Festival, string: 'Festival' },
		unvalidFestival: { model: UnvalidatedFestival, string: 'Festival' },
		validFestivalEvent: { model: FestivalEvent, string: 'Festival event' }
	};

	categories[collection].model.findOne({ _id: id })
		.then(item => {
			if (!item)
				return next(null, { status: 400, message: 'No ' + categories[collection].string.toLowerCase() + ' found with this ID' });

			categories[collection].model.remove({ _id: id }, (err, deleted) => {
				if (err) return next(err, null);

				switch (collection) {
					case 'validEvent':
						deleteReports('event', id, (err) => {
							if (err) return next(err, null);
							return next(null, { status: 200, message: 'Event deleted' });
						});
						break;
					case 'validBand':
						bandupdateFunction(Event, id, (err) => {
							if (err) return next(err, null);
							bandupdateFunction(ArchivedEvent, id, (err) => {
								if (err) return next(err, null);
								bandupdateFunction(UnvalidatedEvent, id, (err) => {
									if (err) return next(err, null);
									bandupdateFunction(FestivalEvent, id, (err) => {
										if (err) return next(err, null);
										bandupdateFunction(UnvalidatedFestivalEvent, id, (err) => {
											if (err) return next(err, null);
											deleteReports('band', id, (err) => {
												if (err) return next(err, null);
												return next(null, { status: 200, message: 'Band deleted' });
											});
										});
									});
								});
							});
						});
						break;
					case 'validLocation':
						Event.remove({ location: id }, (err, location) => {
							if (err) return next(err, null);
							ArchivedEvent.remove({ location: id }, (err, location) => {
								if (err) return next(err, null);
								UnvalidatedEvent.remove({ location: id }, (err, location) => {
									if (err) return next(err, null);
									deleteReports('location', id, (err) => {
										if (err) return next(err, null);
										return next(null, { status: 200, message: 'Location deleted' });
									});
								});
							});
						});
						break;
					case 'validFestival':
						let validIds = [];
						item.events.forEach(event => {
							validIds.push({ _id: event });
						});

						FestivalEvent.remove({ $or: validIds }, (err, events) => {
							if (err) return next(err, null);
							UnvalidatedFestivalEvent.remove({ $or: validIds }, (err, events) => {
								if (err) return next(err, null);
								deleteReports('festival', id, (err) => {
									if (err) return next(err, null);
									return next(null, { status: 200, message: 'Festival deleted' });
								});
							});
						});
						break;
					case 'unvalidFestival':
						let unvalidIds = [];
						item.events.forEach(event => {
							unvalidIds.push({ _id: event });
						});

						UnvalidatedFestivalEvent.remove({ $or: unvalidIds }, (err, events) => {
							if (err) return next(err, null);
							return next(null, { status: 200, message: 'Festival deleted' });
						});
						break;
					case 'validFestivalEvent':
						Festival.findOne({ events: id })
							.then(festival => {
								if (!festival)
									return next(null, { status: 200, message: 'Festival event deleted' });

								festival.events.splice(festival.events.indexOf(id), 1);
								Festival.findOneAndUpdate({ _id: festival._id }, festival, (err, updatedFestival) => {
									if (err) return next(err, null);
									return next(null, { status: 200, message: 'Festival event deleted' });
								});
							})
							.catch(err => {
								return next(err, null);
							});
						break;
					default:
						return next(null, { status: 200, message: categories[collection].string + ' deleted' });
				}
			});
		})
		.catch(err => {
			return next(err, null);
		});
}

const bandupdateFunction = (collection, id, next) => {
	collection.find({ bands: id })
		.then(events => {
			if (events.length == 0) return next(null);

			let counter = 0;

			events.forEach((event, listIndex, array) => {
				event.bands.splice(event.bands.indexOf(id), 1);
				collection.findOneAndUpdate({ _id: event._id }, event, (err, updatedEvent) => {
					if (err) return next(err);

					counter++;
					if (counter == array.length) {
						return next(null);
					}
				});
			});
		})
		.catch(err => {
			return next(err);
		});
}

const deleteReports = (collection, id, next) => {
	Report.remove({ category: collection, item: id }, (err, reports) => {
		if (err) return next(err);
		return next(null);
	});
}