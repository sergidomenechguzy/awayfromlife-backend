const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');

// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');
// load regex.js
const regex = require(dirPath + '/api/helpers/regex');

function convertEventFile(file) {
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
						const response = await convertEvent(object);
						return response;
					});
					const eventList = await Promise.all(promises);
					await unlinkAsync(file.path);
					return resolve(eventList);
				});
		}
		catch (err) {
			reject(err);
		}
	});
}

function convertEvent(object) {
	return new Promise(async (resolve, reject) => {
		try {
			const locationStrings = object.location.split(',');
			const locationQuery = {
				name: regex.generate(locationStrings[0].trim()),
				$or: [
					{ 'address.default.city': regex.generate(locationStrings[1].trim()) },
					{ 'address.international.city': regex.generate(locationStrings[1].trim()) }
				]
			}
			let location = await Location.findOne(locationQuery);
			if (!location) {
				location = `Location "${object.location.trim()}" not found`
			} else {
				location = await dereference.locationObject(location);
			}

			const date = moment(object.date, "DD-MM-YYYY").format('YYYY-MM-DD');

			const bandsStrings = object.bands.split(',');
			const promises = bandsStrings.map(async (bandString) => {
				let band = await Band.findOne({ name: regex.generate(bandString.trim()) });
				if (!band) {
					band = `Band "${bandString.trim()}" not found`
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

module.exports = {
	convertEventFile: convertEventFile
};