const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load url.js
const url = require('../config/url');

// validate all attributes for event objects in the request body
module.exports.reqEvent = (type, model) => {
	return (req, res, next) => {
		if (!(typeof req.body.title == 'string' && req.body.title.length > 0))
			return res.status(400).json({ message: 'Attribute \'title\' has to be a string with 1 or more characters.' });

		if (!(req.body.description == undefined || typeof req.body.description == 'string'))
			return res.status(400).json({ message: 'Attribute \'description\' can be left out or has to be a string.' });

		if (!(typeof req.body.location == 'string' && req.body.location.length > 0))
			return res.status(400).json({ message: 'Attribute \'location\' has to be the ID of a location from the database.' });

		if (!(typeof req.body.startDate == 'string' && req.body.startDate.length > 0))
			return res.status(400).json({ message: 'Attribute \'startDate\' has to be a string with 1 or more characters.' });

		if (!(Array.isArray(req.body.bands) && req.body.bands.length > 0))
			return res.status(400).json({ message: 'Attribute \'bands\' has to be an array of IDs of bands from the database and must not be empty.' });

		if (!(req.body.canceled == undefined || (typeof req.body.canceled == 'number' && (req.body.canceled == 0 || req.body.canceled == 1 || req.body.canceled == 2))))
			return res.status(400).json({ message: 'Attribute \'canceled\' can be left out or has to be either \'0\', \'1\' or \'2\' as a number.' });

		if (!(req.body.ticketLink == undefined || typeof req.body.ticketLink == 'string'))
			return res.status(400).json({ message: 'Attribute \'ticketLink\' can be left out or has to be a string.' });

		Location.find()
			.then(locations => {
				const locationIds = locations.map(location => location._id.toString());
				if (!locationIds.includes(req.body.location))
					return res.status(400).json({ message: 'Attribute \'location\' has to be the ID of a location from the database.' });

				Band.find()
					.then(bands => {
						const bandIds = bands.map(band => band._id.toString());
						if (
							req.body.bands.some(band => {
								if (!bandIds.includes(band)) return true;
								return false;
							})
						) return res.status(400).json({ message: 'Attribute \'bands\' has to be an array of IDs of bands from the database and must not be empty.' });
						let newEvent;
						if (type == 'put') {
							let collection = (model == 'archive') ? ArchivedEvent : Event;
							collection.findOne({ _id: req.params._id })
								.then(event => {
									if (!event)
										return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

									newEvent = {
										_id: req.params._id,
										title: req.body.title,
										url: '',
										description: req.body.description != undefined ? req.body.description : event.description,
										location: req.body.location,
										startDate: req.body.startDate,
										bands: req.body.bands,
										canceled: req.body.canceled != undefined ? req.body.canceled : event.canceled,
										ticketLink: req.body.ticketLink != undefined ? req.body.ticketLink : event.ticketLink,
										lastModified: Date.now()
									};
									url.generateEventUrl(newEvent, model, (err, responseEvent) => {
										if (err) {
											console.log(err.name + ': ' + err.message);
											return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
										}
										res.locals.validated = responseEvent;
										return next();
									});
								})
								.catch(err => {
									console.log(err.name + ': ' + err.message);
									return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
								});
						}
						else {
							newEvent = {
								title: req.body.title,
								url: '',
								description: req.body.description != undefined ? req.body.description : '',
								location: req.body.location,
								startDate: req.body.startDate,
								bands: req.body.bands,
								canceled: req.body.canceled != undefined ? req.body.canceled : 0,
								ticketLink: req.body.ticketLink != undefined ? req.body.ticketLink : ''
							};
							if (type == 'unvalidated') {
								res.locals.validated = newEvent;
								return next();
							}
							else {
								url.generateEventUrl(newEvent, model, (err, responseEvent) => {
									if (err) {
										console.log(err.name + ': ' + err.message);
										return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
									}
									res.locals.validated = responseEvent;
									return next();
								});
							}
						}
					})
					.catch(err => {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					});
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	}
}

// validate all attributes for band objects in the request body
module.exports.reqBand = (type) => {
	return (req, res, next) => {
		if (!(typeof req.body.name == 'string' && req.body.name.length > 0))
			return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

		if (!(Array.isArray(req.body.genre) && req.body.genre.length > 0 && req.body.genre.length < 4))
			return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.1' });

		if (!(typeof req.body.origin.name == 'string' && req.body.origin.name.length > 0))
			return res.status(400).json({ message: 'Attribute \'origin.name\' has to be a string with 1 or more characters.' });

		if (!(req.body.origin.administrative == undefined || typeof req.body.origin.administrative == 'string'))
			return res.status(400).json({ message: 'Attribute \'origin.administrative\' can be left out or has to be a string.' });

		if (!(typeof req.body.origin.country == 'string' && req.body.origin.country.length > 0))
			return res.status(400).json({ message: 'Attribute \'origin.country\' has to be a string with 1 or more characters.' });

		if (!(req.body.origin.postcode == undefined || typeof req.body.origin.postcode == 'string'))
			return res.status(400).json({ message: 'Attribute \'origin.postcode\' can be left out or has to be a string.' });

		if (typeof req.body.origin.lat != 'number')
			return res.status(400).json({ message: 'Attribute \'origin.lat\' has to be a number.' });

		if (typeof req.body.origin.lng != 'number')
			return res.status(400).json({ message: 'Attribute \'origin.lng\' has to be a number.' });

		if (!(req.body.origin.value == undefined || typeof req.body.origin.value == 'string'))
			return res.status(400).json({ message: 'Attribute \'origin.value\' can be left out or has to be a string.' });

		if (!(req.body.history == undefined || typeof req.body.history == 'string'))
			return res.status(400).json({ message: 'Attribute \'history\' can be left out or has to be a string.' });

		if (!(req.body.recordLabel == undefined || typeof req.body.recordLabel == 'string'))
			return res.status(400).json({ message: 'Attribute \'recordLabel\' can be left out or has to be a string.' });

		if (!(req.body.releases == undefined || Array.isArray(req.body.releases)))
			return res.status(400).json({ message: 'Attribute \'releases\' has to be an array of objects with the attributes \'releaseName\' and \'releaseYear\'.' });
		if (
			req.body.releases != undefined
			&&
			req.body.releases.some(release => {
				if (release.releaseName == undefined || release.releaseYear == undefined) return true;
				return false;
			})
		) return res.status(400).json({ message: 'Attribute \'releases\' has to be an array of objects each with the attributes \'releaseName\' and \'releaseYear\'.' });

		if (!(req.body.foundingDate == undefined || typeof req.body.foundingDate == 'string'))
			return res.status(400).json({ message: 'Attribute \'foundingDate\' can be left out or has to be a string.' });

		if (!(req.body.websiteUrl == undefined || typeof req.body.websiteUrl == 'string'))
			return res.status(400).json({ message: 'Attribute \'websiteUrl\' can be left out or has to be a string.' });

		if (!(req.body.bandcampUrl == undefined || typeof req.body.bandcampUrl == 'string'))
			return res.status(400).json({ message: 'Attribute \'bandcampUrl\' can be left out or has to be a string.' });

		if (!(req.body.soundcloudUrl == undefined || typeof req.body.soundcloudUrl == 'string'))
			return res.status(400).json({ message: 'Attribute \'soundcloudUrl\' can be left out or has to be a string.' });

		if (!(req.body.facebookUrl == undefined || typeof req.body.facebookUrl == 'string'))
			return res.status(400).json({ message: 'Attribute \'facebookUrl\' can be left out or has to be a string.' });

		Genre.find()
			.then(genres => {
				let finalGenres = [];
				if (
					req.body.genre.some(reqGenre => {
						return !genres.some(savedGenre => {
							if (savedGenre.name == reqGenre) {
								finalGenres.push(savedGenre._id);
								return true;
							}
							return false;
						});
					})
				) return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.2' });

				let newBand;
				if (type == 'put') {
					Band.findOne({ _id: req.params._id })
						.then(band => {
							if (!band)
								return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });

							newBand = {
								_id: req.params._id,
								name: req.body.name,
								url: '',
								genre: finalGenres,
								origin: {
									name: req.body.origin.name,
									administrative: req.body.origin.administrative != undefined ? req.body.origin.administrative : band.origin.administrative,
									country: req.body.origin.country,
									postcode: req.body.origin.postcode != undefined ? req.body.origin.postcode : band.origin.postcode,
									lat: req.body.origin.lat,
									lng: req.body.origin.lng,
									value: req.body.origin.value != undefined ? req.body.origin.value : band.origin.value
								},
								history: req.body.history != undefined ? req.body.history : band.history,
								recordLabel: req.body.recordLabel != undefined ? req.body.recordLabel : band.recordLabel,
								releases: req.body.releases != undefined ? req.body.releases : band.releases,
								foundingDate: req.body.foundingDate != undefined ? req.body.foundingDate : band.foundingDate,
								websiteUrl: req.body.websiteUrl != undefined ? req.body.websiteUrl : band.websiteUrl,
								bandcampUrl: req.body.bandcampUrl != undefined ? req.body.bandcampUrl : band.bandcampUrl,
								soundcloudUrl: req.body.soundcloudUrl != undefined ? req.body.soundcloudUrl : band.soundcloudUrl,
								facebookUrl: req.body.facebookUrl != undefined ? req.body.facebookUrl : band.facebookUrl
							};
							url.generateUrl(newBand, Band, (err, responseBand) => {
								if (err) {
									console.log(err.name + ': ' + err.message);
									return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
								}
								res.locals.validated = responseBand;
								return next();
							});
						})
						.catch(err => {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						});
				}
				else {
					newBand = {
						name: req.body.name,
						url: '',
						genre: finalGenres,
						origin: {
							name: req.body.origin.name,
							administrative: req.body.origin.administrative != undefined ? req.body.origin.administrative : '',
							country: req.body.origin.country,
							postcode: req.body.origin.postcode != undefined ? req.body.origin.postcode : '',
							lat: req.body.origin.lat,
							lng: req.body.origin.lng,
							value: req.body.origin.value != undefined ? req.body.origin.value : ''
						},
						history: req.body.history != undefined ? req.body.history : '',
						recordLabel: req.body.recordLabel != undefined ? req.body.recordLabel : '',
						releases: req.body.releases != undefined ? req.body.releases : [],
						foundingDate: req.body.foundingDate != undefined ? req.body.foundingDate : '',
						websiteUrl: req.body.websiteUrl != undefined ? req.body.websiteUrl : '',
						bandcampUrl: req.body.bandcampUrl != undefined ? req.body.bandcampUrl : '',
						soundcloudUrl: req.body.soundcloudUrl != undefined ? req.body.soundcloudUrl : '',
						facebookUrl: req.body.facebookUrl != undefined ? req.body.facebookUrl : ''
					};
					if (type == 'unvalidated') {
						res.locals.validated = newBand;
						return next();
					}
					else {
						url.generateUrl(newBand, Band, (err, responseBand) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							res.locals.validated = responseBand;
							return next();
						});
					}
				}
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.3' });
			});
	}
}

// validate all attributes for location objects in the request body
module.exports.reqLocation = (type) => {
	return (req, res, next) => {
		if (!(typeof req.body.name == 'string' && req.body.name.length > 0))
			return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

		if (!(typeof req.body.address.street == 'string' && req.body.address.street.length > 0))
			return res.status(400).json({ message: 'Attribute \'address.street\' has to be a string with 1 or more characters.' });

		if (!(req.body.address.administrative == undefined || typeof req.body.address.administrative == 'string'))
			return res.status(400).json({ message: 'Attribute \'address.administrative\' can be left out or has to be a string.' });

		if (!(typeof req.body.address.city == 'string' && req.body.address.city.length > 0))
			return res.status(400).json({ message: 'Attribute \'address.city\' has to be a string with 1 or more characters.' });

		if (!(req.body.address.county == undefined || typeof req.body.address.county == 'string'))
			return res.status(400).json({ message: 'Attribute \'address.county\' can be left out or has to be a string.' });

		if (!(typeof req.body.address.country == 'string' && req.body.address.country.length > 0))
			return res.status(400).json({ message: 'Attribute \'address.country\' has to be a string with 1 or more characters.' });

		if (!(req.body.address.postcode == undefined || typeof req.body.address.postcode == 'string'))
			return res.status(400).json({ message: 'Attribute \'address.postcode\' can be left out or has to be a string.' });

		if (typeof req.body.address.lat != 'number')
			return res.status(400).json({ message: 'Attribute \'address.lat\' has to be a number.' });

		if (typeof req.body.address.lng != 'number')
			return res.status(400).json({ message: 'Attribute \'address.lng\' has to be a number.' });

		if (!(req.body.address.value == undefined || typeof req.body.address.value == 'string'))
			return res.status(400).json({ message: 'Attribute \'address.value\' can be left out or has to be a string.' });

		if (!(req.body.status == undefined || (typeof req.body.status == 'string' && (req.body.status == 'opened' || req.body.status == 'closed'))))
			return res.status(400).json({ message: 'Attribute \'status\' can be left out or has to be either \'opened\' or \'closed\' as a string.' });

		if (!(req.body.information == undefined || typeof req.body.information == 'string'))
			return res.status(400).json({ message: 'Attribute \'information\' can be left out or has to be a string.' });

		if (!(req.body.website == undefined || typeof req.body.website == 'string'))
			return res.status(400).json({ message: 'Attribute \'website\' can be left out or has to be a string.' });

		if (!(req.body.facebookUrl == undefined || typeof req.body.facebookUrl == 'string'))
			return res.status(400).json({ message: 'Attribute \'facebookUrl\' can be left out or has to be a string.' });

		let newLocation;
		if (type == 'put') {
			Location.findOne({ _id: req.params._id })
				.then(location => {
					if (!location)
						return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });

					newLocation = {
						_id: req.params._id,
						name: req.body.name,
						url: '',
						address: {
							street: req.body.address.street,
							administrative: req.body.address.administrative != undefined ? req.body.address.administrative : location.address.administrative,
							city: req.body.address.city,
							county: req.body.address.county != undefined ? req.body.address.county : location.address.county,
							country: req.body.address.country,
							postcode: req.body.address.postcode != undefined ? req.body.address.postcode : location.address.postcode,
							lat: req.body.address.lat,
							lng: req.body.address.lng,
							value: req.body.address.value != undefined ? req.body.address.value : location.address.value
						},
						status: req.body.status != undefined ? req.body.status : location.status,
						information: req.body.information != undefined ? req.body.information : location.information,
						website: req.body.website != undefined ? req.body.website : location.website,
						facebookUrl: req.body.facebookUrl != undefined ? req.body.facebookUrl : location.facebookUrl
					};
					url.generateUrl(newLocation, Location, (err, responseLocation) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						res.locals.validated = responseLocation;
						return next();
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		}
		else {
			newLocation = {
				name: req.body.name,
				url: '',
				address: {
					street: req.body.address.street,
					administrative: req.body.address.administrative != undefined ? req.body.address.administrative : '',
					city: req.body.address.city,
					county: req.body.address.county != undefined ? req.body.address.county : '',
					country: req.body.address.country,
					postcode: req.body.address.postcode != undefined ? req.body.address.postcode : '',
					lat: req.body.address.lat,
					lng: req.body.address.lng,
					value: req.body.address.value != undefined ? req.body.address.value : ''
				},
				status: req.body.status != undefined ? req.body.status : 'opened',
				information: req.body.information != undefined ? req.body.information : '',
				website: req.body.website != undefined ? req.body.website : '',
				facebookUrl: req.body.facebookUrl != undefined ? req.body.facebookUrl : ''
			};
			if (type == 'unvalidated') {
				res.locals.validated = newLocation;
				return next();
			}
			else {
				url.generateUrl(newLocation, Location, (err, responseLocation) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					res.locals.validated = responseLocation;
					return next();
				});
			}
		}
	}
}

// validate all attributes for bug objects in the request body
module.exports.reqBug = () => {
	return (req, res, next) => {
		if (!(typeof req.body.error == 'string' && req.body.error.length > 0))
			return res.status(400).json({ message: 'Attribute \'error\' has to be a string with 1 or more characters.' });

		if (!(req.body.description == undefined || typeof req.body.description == 'string'))
			return res.status(400).json({ message: 'Attribute \'description\' can be left out or has to be a string.' });

		if (!(req.body.loggedIn == undefined || (typeof req.body.loggedIn == 'number' && (req.body.loggedIn == 0 || req.body.loggedIn == 1 || req.body.loggedIn == 2))))
			return res.status(400).json({ message: 'Attribute \'loggedIn\' can be left out or has to be either \'0\', \'1\' or \'2\' as a number.' });

		if (!(req.body.component == undefined || typeof req.body.component == 'string'))
			return res.status(400).json({ message: 'Attribute \'component\' can be left out or has to be a string.' });

		if (!(req.body.email == undefined || typeof req.body.email == 'string'))
			return res.status(400).json({ message: 'Attribute \'email\' can be left out or has to be a string.' });

		let newBug = {
			error: req.body.error,
			description: req.body.description != undefined ? req.body.description : '',
			loggedIn: req.body.loggedIn != undefined ? req.body.loggedIn : 2,
			component: req.body.component != undefined ? req.body.component : '',
			email: req.body.email != undefined ? req.body.email : ''
		};
		res.locals.validated = newBug;
		return next();
	}
}

// validate all attributes for feedback objects in the request body
module.exports.reqFeedback = () => {
	return (req, res, next) => {
		if (!(typeof req.body.text == 'string' && req.body.text.length > 0))
			return res.status(400).json({ message: 'Attribute \'text\' has to be a string with 1 or more characters.' });

		if (!(req.body.email == undefined || typeof req.body.email == 'string'))
			return res.status(400).json({ message: 'Attribute \'email\' can be left out or has to be a string.' });

		let newFeedback = {
			text: req.body.text,
			email: req.body.email != undefined ? req.body.email : ''
		};
		res.locals.validated = newFeedback;
		return next();
	}
}

// validate all attributes for report objects in the request body
module.exports.reqReport = () => {
	return (req, res, next) => {
		if (!(req.body.category.toLowerCase() === 'event' || req.body.category.toLowerCase() === 'location' || req.body.category.toLowerCase() === 'band'))
			return res.status(400).json({ message: 'Attribute \'category\' has to be either \'event\', \'location\' or \'band\' as a string.' });

		if (!(typeof req.body.item == 'string' && req.body.item.length > 0))
			return res.status(400).json({ message: 'Attribute \'item\' has to be the ID of one item from the specified category from the database.' });

		if (!(req.body.description == undefined || typeof req.body.description == 'string'))
			return res.status(400).json({ message: 'Attribute \'description\' can be left out or has to be a string.' });

		const categories = {
			event: Event,
			location: Location,
			band: Band
		}
		
		categories[req.body.category.toLowerCase()].findOne({ _id: req.body.item })
			.then(item => {
				if (!item) return res.status(200).json({ message: 'No item found with this ID in the specified category', token: res.locals.token });
	
				let newReport = {
					category: req.body.category.toLowerCase(),
					item: req.body.item,
					description: req.body.description != undefined ? req.body.description : ''
				};
				res.locals.validated = newReport;
				return next();
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
	}
}

// validate all attributes for genre objects in the request body
module.exports.reqGenre = (type) => {
	return (req, res, next) => {
		if (!(typeof req.body.name == 'string' && req.body.name.length > 0))
			return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

		Genre.find()
		.then(genres => {
			let genreNames = genres.map(genre => genre.name.toLowerCase());
			if (type == 'put') {
				Genre.findOne({ _id: req.params._id })
					.then(genre => {
						if (!genre) 
							return res.status(400).json({ message: 'No genre found with this ID', token: res.locals.token });
							
						let index = genreNames.indexOf(req.body.name.toLowerCase());
						if (index < 0) {
							let newGenre = {
								_id: req.params._id,
								name: req.body.name
							};
							res.locals.validated = newGenre;
							return next();
						}
						if (genres[index]._id.toString() == req.params._id) {
							let newGenre = {
								_id: req.params._id,
								name: req.body.name
							};
							res.locals.validated = newGenre;
							return next();
						}
						return res.status(400).json({ message: 'A genre with this name already exists.' });
					})
					.catch(err => {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					});
			}
			else {
				if (genreNames.includes(req.body.name.toLowerCase())) {
					return res.status(400).json({ message: 'A genre with this name already exists.' });
				}
				
				let newGenre = {
					name: req.body.name
				};
				res.locals.validated = newGenre;
				return next();
			}
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
	}
}