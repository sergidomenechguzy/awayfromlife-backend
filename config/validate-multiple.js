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

// validate all attributes for a list of event objects in the request body
module.exports.reqEventList = (type, model) => {
	return (req, res, next) => {
		eventRecursion(req.body.list, [], type, model, res, next);
	}
}

const eventRecursion = (reqList, resList, type, model, res, next) => {
	if (reqList.length == 0) {
		res.locals.validated = resList;
		return next();
	}
	const current = reqList[0];

	if (!(typeof current.title == 'string' && current.title.length > 0))
		return res.status(400).json({ message: 'Attribute \'title\' has to be a string with 1 or more characters.' });

	if (!(current.description == undefined || typeof current.description == 'string'))
		return res.status(400).json({ message: 'Attribute \'description\' can be left out or has to be a string.' });

	if (!(typeof current.location == 'string' && current.location.length > 0))
		return res.status(400).json({ message: 'Attribute \'location\' has to be the ID of a location from the database.' });

	if (!(typeof current.date == 'string' && current.date.length > 0))
		return res.status(400).json({ message: 'Attribute \'date\' has to be a string with 1 or more characters.' });
	
	if (!(current.time == undefined || typeof current.time == 'string'))
		return res.status(400).json({ message: 'Attribute \'time\' can be left out or has to be a string.' });

	if (!(Array.isArray(current.bands) && current.bands.length > 0))
		return res.status(400).json({ message: 'Attribute \'bands\' has to be an array of IDs of bands from the database and must not be empty.' });

	if (!(current.canceled == undefined || (typeof current.canceled == 'number' && (current.canceled == 0 || current.canceled == 1 || current.canceled == 2))))
		return res.status(400).json({ message: 'Attribute \'canceled\' can be left out or has to be either \'0\', \'1\' or \'2\' as a number.' });

	if (!(current.ticketLink == undefined || typeof current.ticketLink == 'string'))
		return res.status(400).json({ message: 'Attribute \'ticketLink\' can be left out or has to be a string.' });

	
	Location.find()
		.then(locations => {
			const locationIds = locations.map(location => location._id.toString());
			if (!locationIds.includes(current.location))
				return res.status(400).json({ message: 'Attribute \'location\' has to be the ID of a location from the database.' });

			Band.find()
				.then(bands => {
					const bandIds = bands.map(band => band._id.toString());
					if (
						current.bands.some(band => {
							if (!bandIds.includes(band)) return true;
							return false;
						})
					) return res.status(400).json({ message: 'Attribute \'bands\' has to be an array of IDs of bands from the database and must not be empty.' });
					
					let newEvent = {
						title: current.title,
						url: '',
						description: current.description != undefined ? current.description : '',
						location: current.location,
						date: current.date,
						time: current.time != undefined ? current.time : '',
						bands: current.bands,
						canceled: current.canceled != undefined ? current.canceled : 0,
						ticketLink: current.ticketLink != undefined ? current.ticketLink : ''
					};
					if (type == 'unvalidated') {
						resList.push(newEvent);
						reqList.splice(0, 1);
						return eventRecursion(reqList, resList, type, model, res, next);
					}
					else {
						const urlList = resList.map(object => object.url);
						url.generateEventUrlWithList(newEvent, model, urlList, (err, responseObject) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							resList.push(responseObject);
							reqList.splice(0, 1);
							return eventRecursion(reqList, resList, type, model, res, next);
						});
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

// validate all attributes for a list of band objects in the request body
module.exports.reqBandList = (type) => {
	return (req, res, next) => {
		bandRecursion(req.body.list, [], type, res, next);
	}
}

const bandRecursion = (reqList, resList, type, res, next) => {
	if (reqList.length == 0) {
		res.locals.validated = resList;
		return next();
	}
	const current = reqList[0];

	if (!(typeof current.name == 'string' && current.name.length > 0))
		return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

	if (!(Array.isArray(current.genre) && current.genre.length > 0 && current.genre.length < 4))
		return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.' });

	if (!(typeof current.origin.name == 'string' && current.origin.name.length > 0))
		return res.status(400).json({ message: 'Attribute \'origin.name\' has to be a string with 1 or more characters.' });

	if (!(current.origin.administrative == undefined || typeof current.origin.administrative == 'string'))
		return res.status(400).json({ message: 'Attribute \'origin.administrative\' can be left out or has to be a string.' });

	if (!(typeof current.origin.country == 'string' && current.origin.country.length > 0))
		return res.status(400).json({ message: 'Attribute \'origin.country\' has to be a string with 1 or more characters.' });

	if (!(current.origin.postcode == undefined || typeof current.origin.postcode == 'string'))
		return res.status(400).json({ message: 'Attribute \'origin.postcode\' can be left out or has to be a string.' });

	if (typeof current.origin.lat != 'number')
		return res.status(400).json({ message: 'Attribute \'origin.lat\' has to be a number.' });

	if (typeof current.origin.lng != 'number')
		return res.status(400).json({ message: 'Attribute \'origin.lng\' has to be a number.' });

	if (!(current.origin.value == undefined || typeof current.origin.value == 'string'))
		return res.status(400).json({ message: 'Attribute \'origin.value\' can be left out or has to be a string.' });

	if (!(current.history == undefined || typeof current.history == 'string'))
		return res.status(400).json({ message: 'Attribute \'history\' can be left out or has to be a string.' });

	if (!(current.recordLabel == undefined || typeof current.recordLabel == 'string'))
		return res.status(400).json({ message: 'Attribute \'recordLabel\' can be left out or has to be a string.' });

	if (!(current.releases == undefined || Array.isArray(current.releases)))
		return res.status(400).json({ message: 'Attribute \'releases\' has to be an array of objects with the attributes \'releaseName\' and \'releaseYear\'.' });
	if (
		current.releases != undefined
		&&
		current.releases.some(release => {
			if (release.releaseName == undefined || release.releaseYear == undefined) return true;
			return false;
		})
	) return res.status(400).json({ message: 'Attribute \'releases\' has to be an array of objects each with the attributes \'releaseName\' and \'releaseYear\'.' });

	if (!(current.foundingDate == undefined || typeof current.foundingDate == 'string'))
		return res.status(400).json({ message: 'Attribute \'foundingDate\' can be left out or has to be a string.' });

	if (!(current.websiteUrl == undefined || typeof current.websiteUrl == 'string'))
		return res.status(400).json({ message: 'Attribute \'websiteUrl\' can be left out or has to be a string.' });

	if (!(current.bandcampUrl == undefined || typeof current.bandcampUrl == 'string'))
		return res.status(400).json({ message: 'Attribute \'bandcampUrl\' can be left out or has to be a string.' });

	if (!(current.soundcloudUrl == undefined || typeof current.soundcloudUrl == 'string'))
		return res.status(400).json({ message: 'Attribute \'soundcloudUrl\' can be left out or has to be a string.' });

	if (!(current.facebookUrl == undefined || typeof current.facebookUrl == 'string'))
		return res.status(400).json({ message: 'Attribute \'facebookUrl\' can be left out or has to be a string.' });

	Genre.find()
		.then(genres => {
			let finalGenres = [];
			if (
				current.genre.some(reqGenre => {
					return !genres.some(savedGenre => {
						if (savedGenre.name == reqGenre) {
							finalGenres.push(savedGenre._id);
							return true;
						}
						return false;
					});
				})
			) return res.status(400).json({ message: 'Attribute \'genre\' has to be an array of names of genres from the database with 1-3 entries.' });

			let newBand = {
				name: current.name,
				url: '',
				genre: finalGenres,
				origin: {
					name: current.origin.name,
					administrative: current.origin.administrative != undefined ? current.origin.administrative : '',
					country: current.origin.country,
					postcode: current.origin.postcode != undefined ? current.origin.postcode : '',
					lat: current.origin.lat,
					lng: current.origin.lng,
					value: current.origin.value != undefined ? current.origin.value : ''
				},
				history: current.history != undefined ? current.history : '',
				recordLabel: current.recordLabel != undefined ? current.recordLabel : '',
				releases: current.releases != undefined ? current.releases : [],
				foundingDate: current.foundingDate != undefined ? current.foundingDate : '',
				websiteUrl: current.websiteUrl != undefined ? current.websiteUrl : '',
				bandcampUrl: current.bandcampUrl != undefined ? current.bandcampUrl : '',
				soundcloudUrl: current.soundcloudUrl != undefined ? current.soundcloudUrl : '',
				facebookUrl: current.facebookUrl != undefined ? current.facebookUrl : ''
			};
			if (type == 'unvalidated') {
				resList.push(newBand);
				reqList.splice(0, 1);
				return bandRecursion(reqList, resList, type, res, next);
			}
			else {
				const urlList = resList.map(object => object.url);
				url.generateUrlWithList(newBand, Band, urlList, (err, responseObject) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					resList.push(responseObject);
					reqList.splice(0, 1);
					return bandRecursion(reqList, resList, type, res, next);
				});
			}
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
}

// validate all attributes for a list of location objects in the request body
module.exports.reqLocationList = (type) => {
	return (req, res, next) => {
		locationRecursion(req.body.list, [], type, res, next);
	}
}

const locationRecursion = (reqList, resList, type, res, next) => {
	if (reqList.length == 0) {
		res.locals.validated = resList;
		return next();
	}
	const current = reqList[0];

	if (!(typeof current.name == 'string' && current.name.length > 0))
		return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

	if (!(typeof current.address.street == 'string' && current.address.street.length > 0))
		return res.status(400).json({ message: 'Attribute \'address.street\' has to be a string with 1 or more characters.' });

	if (!(current.address.administrative == undefined || typeof current.address.administrative == 'string'))
		return res.status(400).json({ message: 'Attribute \'address.administrative\' can be left out or has to be a string.' });

	if (!(typeof current.address.city == 'string' && current.address.city.length > 0))
		return res.status(400).json({ message: 'Attribute \'address.city\' has to be a string with 1 or more characters.' });

	if (!(current.address.county == undefined || typeof current.address.county == 'string'))
		return res.status(400).json({ message: 'Attribute \'address.county\' can be left out or has to be a string.' });

	if (!(typeof current.address.country == 'string' && current.address.country.length > 0))
		return res.status(400).json({ message: 'Attribute \'address.country\' has to be a string with 1 or more characters.' });

	if (!(current.address.postcode == undefined || typeof current.address.postcode == 'string'))
		return res.status(400).json({ message: 'Attribute \'address.postcode\' can be left out or has to be a string.' });

	if (typeof current.address.lat != 'number')
		return res.status(400).json({ message: 'Attribute \'address.lat\' has to be a number.' });

	if (typeof current.address.lng != 'number')
		return res.status(400).json({ message: 'Attribute \'address.lng\' has to be a number.' });

	if (!(current.address.value == undefined || typeof current.address.value == 'string'))
		return res.status(400).json({ message: 'Attribute \'address.value\' can be left out or has to be a string.' });

	if (!(current.status == undefined || (typeof current.status == 'string' && (current.status == 'opened' || current.status == 'closed'))))
		return res.status(400).json({ message: 'Attribute \'status\' can be left out or has to be either \'opened\' or \'closed\' as a string.' });

	if (!(current.information == undefined || typeof current.information == 'string'))
		return res.status(400).json({ message: 'Attribute \'information\' can be left out or has to be a string.' });

	if (!(current.website == undefined || typeof current.website == 'string'))
		return res.status(400).json({ message: 'Attribute \'website\' can be left out or has to be a string.' });

	if (!(current.facebookUrl == undefined || typeof current.facebookUrl == 'string'))
		return res.status(400).json({ message: 'Attribute \'facebookUrl\' can be left out or has to be a string.' });

	let newLocation = {
		name: current.name,
		url: '',
		address: {
			street: current.address.street,
			administrative: current.address.administrative != undefined ? current.address.administrative : '',
			city: current.address.city,
			county: current.address.county != undefined ? current.address.county : '',
			country: current.address.country,
			postcode: current.address.postcode != undefined ? current.address.postcode : '',
			lat: current.address.lat,
			lng: current.address.lng,
			value: current.address.value != undefined ? current.address.value : ''
		},
		status: current.status != undefined ? current.status : 'opened',
		information: current.information != undefined ? current.information : '',
		website: current.website != undefined ? current.website : '',
		facebookUrl: current.facebookUrl != undefined ? current.facebookUrl : ''
	};
	if (type == 'unvalidated') {
		resList.push(newLocation);
		reqList.splice(0, 1);
		return locationRecursion(reqList, resList, type, res, next);
	}
	else {
		const urlList = resList.map(object => object.url);
		url.generateUrlWithList(newLocation, Location, urlList, (err, responseObject) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			}
			resList.push(responseObject);
			reqList.splice(0, 1);
			return locationRecursion(reqList, resList, type, res, next);
		});
	}
}

// validate all attributes for a list of genre objects in the request body
module.exports.reqGenreList = () => {
	return (req, res, next) => {
		genreRecursion(req.body.list, [], res, next);
	}		
}

const genreRecursion = (reqList, resList, res, next) => {
	if (reqList.length === 0) {
		res.locals.validated = resList;
		return next();
	}
	const current = reqList[0];

	if (!(typeof current.name == 'string' && current.name.length > 0))
		return res.status(400).json({ message: 'Attribute \'name\' has to be a string with 1 or more characters.' });

	let newGenreNames = resList.map(genre => genre.name.toLowerCase());
	if (newGenreNames.includes(current.name.toLowerCase())) 
		return res.status(400).json({ message: 'All the names of the genres have to be different.' });
	
	Genre.find()
		.then(genres => {
			let genreNames = genres.map(genre => genre.name.toLowerCase());
			if (genreNames.includes(current.name.toLowerCase())) 
				return res.status(400).json({ message: 'At least one genre already exists.' });
			
			let newGenre = {
				name: current.name
			};
			resList.push(newGenre);
			reqList.splice(0, 1);
			return genreRecursion(reqList, resList, res, next);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
}