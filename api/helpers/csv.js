const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const { promisify } = require('util');
const algoliasearch = require('algoliasearch');
const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');
const escapeStringRegexp = require('escape-string-regexp');

const unlinkAsync = promisify(fs.unlink);

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');

// load genre model
require(dirPath + '/api/models/Genre');
const Genre = mongoose.model('genres');

// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');

const types = {
	bands: convertBand,
	events: convertEvent,
	locations: convertLocation,
	festivals: convertFestival
}

function convertFile(file, type) {
	return new Promise((resolve, reject) => {
		try {
			let objectList = [];
			fs.createReadStream(file.path)
				.pipe(csv({ separator: ';' }))
				.on('data', (row) => {
					objectList.push(row);
				})
				.on('end', async () => {
					const promises = objectList.map(async (object) => {
						const response = await types[type](object);
						return response;
					});
					const jsonList = await Promise.all(promises);
					await unlinkAsync(file.path);
					return resolve(jsonList);
				});
		}
		catch (err) {
			reject(err);
		}
	});
}

function convertBand(object) {
	return new Promise(async (resolve, reject) => {
		try {
			const genreStrings = object.genres.split(',');
			const promises = genreStrings.map(async (genreString) => {
				let genre = await Genre.findOne({ name: new RegExp(`^${escapeStringRegexp(genreString.trim())}$`, 'i') });
				if (!genre) {
					genre = `ERROR: Genre "${genreString.trim()}" not found`
				} else {
					genre = genre.name;
				}
				return genre;
			});
			const genres = await Promise.all(promises);
			genres.sort((a, b) => {
				return a.localeCompare(b);
			});

			let releases = [];
			let index = 0;

			while (index < object.releases.length) {
				const index1 = object.releases.indexOf('"', index);
				let index2 = object.releases.indexOf('"', index1 + 1);
				while (!(object.releases[index2 + 1] === '-' || object.releases[index2 + 2] === '-'))
					index2 = object.releases.indexOf('"', index2 + 1);

				const releaseName = object.releases.substring(index1 + 1, index2)
				const index3 = object.releases.indexOf('-', index2 + 1);
				let index4 = object.releases.indexOf(',', index3 + 1);
				if (index4 < 0) index4 = object.releases.length;
				const releaseYear = object.releases.substring(index3 + 1, index4);

				const release = {
					releaseName: releaseName.trim(),
					releaseYear: releaseYear.trim()
				}
				releases.push(release);

				index = index4;
			}

			let res = await places.search({ query: object.origin, type: 'city' });
			const origin =
				res.hits.length === 0
				? `ERROR: Origin "${object.origin}" not found`
				: {
					city: res.hits[0].locale_names.default[0],
					country: res.hits[0].country.default,
					lat: res.hits[0]._geoloc.lat,
					lng: res.hits[0]._geoloc.lng,
					countryCode: res.hits[0].country_code,
					value: object.origin
				}

			const band = {
				name: object.name.trim(),
				foundingDate: object.foundingYear,
				recordLabel: object.label,
				genre: genres,
				origin: origin,
				history: object.description.trim(),
				releases: releases,
				website: object.website.trim(),
				facebookUrl: object.facebook.trim(),
				bandcampUrl: object.bandcamp.trim(),
				soundcloudUrl: object.soundcloud.trim()
			}
			return resolve(band);
		}
		catch (err) {
			reject(err);
		}
	});
}

function convertEvent(object) {
	return new Promise(async (resolve, reject) => {
		try {
			let location;
			const locationStrings = object.location.split(',');
			if (locationStrings.length != 2) {
				location = `ERROR: Location "${object.location.trim()}" did not match format, has to be in the format "<name>, <city>"`;
			} else {
				const locationQuery = {
					name: new RegExp(escapeStringRegexp(locationStrings[0].trim()), 'i'),
					$or: [
						{ 'address.default.city': new RegExp(escapeStringRegexp(locationStrings[1].trim()), 'i') },
						{ 'address.international.city': new RegExp(escapeStringRegexp(locationStrings[1].trim()), 'i') }
					]
				}
				location = await Location.findOne(locationQuery);
				if (!location) {
					location = `ERROR: Location "${object.location.trim()}" not found`;
				} else {
					location = await dereference.locationObject(location);
				}
			}

			const date = moment(object.date, "DD-MM-YYYY").format('YYYY-MM-DD');

			const bandsStrings = object.bands.split(',');
			const promises = bandsStrings.map(async (bandString) => {
				let band = await Band.findOne({ name: new RegExp(escapeStringRegexp(bandString.trim()), 'i') });
				if (!band) {
					band = `ERROR: Band "${bandString.trim()}" not found`
				} else {
					band = await dereference.bandObject(band);
				}
				return band;
			});
			const bands = await Promise.all(promises);

			const event = {
				name: object.name.trim(),
				location: location,
				date: date,
				bands: bands,
				ticketLink: object.ticketLink.trim(),
				description: object.description.trim()
			}
			return resolve(event);
		}
		catch (err) {
			reject(err);
		}
	});
}

function convertFestival(object) {
	return new Promise(async (resolve, reject) => {
		try {
			const genreStrings = object.genres.split(',');
			const genrePromises = genreStrings.map(async (genreString) => {
				let genre = await Genre.findOne({ name: new RegExp(`^${escapeStringRegexp(genreString.trim())}$`, 'i') });
				if (!genre) {
					genre = `ERROR: Genre "${genreString.trim()}" not found`
				} else {
					genre = genre.name;
				}
				return genre;
			});
			const genres = await Promise.all(genrePromises);
			genres.sort((a, b) => {
				return a.localeCompare(b);
			});

			let res = await places.search({ query: object.address, type: 'address' });
			const address = 
				res.hits.length === 0
				? `ERROR: Address "${object.address}" not found`
				: {
					street: res.hits[0].locale_names.default[0],
					city: res.hits[0].city.default[0],
					country: res.hits[0].country.default,
					lat: res.hits[0]._geoloc.lat,
					lng: res.hits[0]._geoloc.lng,
					countryCode: res.hits[0].country_code,
					value: object.address
				}

			const startDate = moment(object.eventStartDate, "DD-MM-YYYY").format('YYYY-MM-DD');
			const endDate = moment(object.eventEndDate, "DD-MM-YYYY").format('YYYY-MM-DD');

			const bandsStrings = object.eventBands.split(',');
			const bandPromises = bandsStrings.map(async (bandString) => {
				let band = await Band.findOne({ name: new RegExp(escapeStringRegexp(bandString.trim()), 'i') });
				if (!band) {
					band = `ERROR: Band "${bandString.trim()}" not found`
				} else {
					band = await dereference.bandObject(band);
				}
				return band;
			});
			const bands = await Promise.all(bandPromises);

			const festival = {
				name: object.name.trim(),
				description: object.description.trim(),
				genre: genres,
				address: address,
				ticketLink: object.ticketLink.trim(),
				website: object.website.trim(),
				facebookUrl: object.facebook.trim(),
			}
			const event = {
				name: object.eventName.trim(),
				description: object.eventDescription.trim(),
				startDate: startDate,
				endDate: endDate,
				bands: bands
			}
			return resolve({festival, event});
		}
		catch (err) {
			reject(err);
		}
	});
}

function convertLocation(object) {
	return new Promise(async (resolve, reject) => {
		try {

			let res = await places.search({ query: object.address, type: 'address' });
			const address = 
				res.hits.length === 0
				? `ERROR: Address "${object.address}" not found`
				: {
					street: res.hits[0].locale_names.default[0],
					city: res.hits[0].city.default[0],
					country: res.hits[0].country.default,
					lat: res.hits[0]._geoloc.lat,
					lng: res.hits[0]._geoloc.lng,
					countryCode: res.hits[0].country_code,
					value: object.address
				}

			const location = {
				name: object.name.trim(),
				address: address,
				information: object.description.trim(),
				website: object.website.trim(),
				facebookUrl: object.facebook.trim(),
			}
			return resolve(location);
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	convertFile: convertFile
};