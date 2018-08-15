const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

const generateUrl = module.exports.generateUrl = (object, model, url, counter, next) => {
	if (!object) return next(null, null);

	model.findOne({ url: url })
		.then(savedObject => {
			if (!savedObject) {
				object.url = url;
				return next(null, object);
			}
			else if (object._id.toString() == savedObject._id.toString()) {
				object.url = url;
				return next(null, object);
			}
			else {
				url = object.url + '-' + counter;
				counter++;
				generateUrl(object, model, url, counter, (err, responseObject) => {
					if (err) return next(err, null);
					return next(null, responseObject);
				});
			}
		})
		.catch(err => {
			return next(err, null);
		});
}

const generateEventUrl = module.exports.generateEventUrl = (object, model, url, counter, next) => {
	if (!object) return next(null, null);

	Event.findOne({ url: url })
		.then(savedObject1 => {
			if (!!savedObject1) {
				if (model == 'event' && object._id.toString() == savedObject1._id.toString()) {
					object.url = url;
					return next(null, object);
				}
				else {
					url = object.url + '-' + counter;
					counter++;
					generateEventUrl(object, model, url, counter, (err, responseObject) => {
						if (err) return next(err, null);
						return next(null, responseObject);
					});
				}
			}
			else {
				ArchivedEvent.findOne({ url: url })
					.then(savedObject2 => {
						if (!!savedObject2) {
							if (model == 'archive' && object._id.toString() == savedObject2._id.toString()) {
								object.url = url;
								return next(null, object);
							}
							else {
								url = object.url + '-' + counter;
								counter++;
								generateEventUrl(object, model, url, counter, (err, responseObject) => {
									if (err) return next(err, null);
									return next(null, responseObject);
								});
							}
						}
						else {
							object.url = url;
							return next(null, object);
						}
					})
					.catch(err => {
						return next(err, null);
					});
			}
		})
		.catch(err => {
			return next(err, null);
		});
}