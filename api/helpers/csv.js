const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');

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
				name: locationStrings[0].trim(),
				$or: [
					{ 'address.default.city': locationStrings[1].trim() },
					{ 'address.international.city': locationStrings[1].trim() }
				]
			}
			const location = await Location.findOne(locationQuery);

			const date = moment(object.date, "DD-MM-YYYY").format('YYYY-MM-DD');

			const bandsStrings = object.bands.split(',');
			const promises = bandsStrings.map(async (bandString) => {
				const band = await Band.find({ name: bandString.trim() });
				return band;
			});
			const bands = await Promise.all(promises);

			const event = {
				name: object.name,
				location: location,
				date: date,
				bands: bands,
				ticketLink: object.ticketLink,
				description: object.description
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