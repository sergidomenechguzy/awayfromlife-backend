// load validateFestival.js
const validateFestival = require(dirPath + '/api/helpers/validateFestival');
// load validateFestivalEvent.js
const validateFestivalEvent = require(dirPath + '/api/helpers/validateFestivalEvent');

module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let festivalOptions = {};
			if (type == 'validate') {
				festivalOptions.id = req.params.festivalId;
				festivalOptions.festivalEventId = req.params.eventId;
			}
			if (req.files['festivalImage'] != undefined && req.files['festivalImage'].length > 0)
				festivalOptions.image = req.files['festivalImage'][0].path;

			const responseFestival = await validateFestival.validateFestival(JSON.parse(req.body.data).festival, type, festivalOptions);
			if (typeof responseFestival == 'string') return res.status(400).json({ message: responseFestival, token: res.locals.token });

			let eventOptions = {};
			if (type == 'validate')
				eventOptions.id = req.params.eventId;
			if (req.files['eventImage'] != undefined && req.files['eventImage'].length > 0)
				eventOptions.image = req.files['eventImage'][0].path;

			const responseEvent = await validateFestivalEvent.validateFestivalEvent(JSON.parse(req.body.data).event, type, eventOptions);
			if (typeof responseEvent == 'string') return res.status(400).json({ message: responseEvent, token: res.locals.token });

			res.locals.validated = { festival: responseFestival, event: responseEvent };
			return next();
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	}
}

// validate all attributes for a list of band objects in the request body
module.exports.validateList = (type) => {
	return async (req, res, next) => {
		try {
			let responseList = [];
			let urlList = [];
			for (const current of req.body.list) {
				const responseFestival = await validateFestival.validateFestival(current.festival, type, { urlList: urlList });
				if (typeof responseFestival == 'string') return res.status(400).json({ message: responseFestival, token: res.locals.token });

				const responseFestivalEvent = await validateFestivalEvent.validateFestivalEvent(current.event, type);
				if (typeof responseFestivalEvent == 'string') return res.status(400).json({ message: responseFestivalEvent, token: res.locals.token });

				responseList.push({ festival: responseFestival, event: responseFestivalEvent });
				urlList.push(responseFestival.url);
			}
			res.locals.validated = responseList;
			return next();
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	}
}