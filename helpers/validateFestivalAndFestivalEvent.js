// load validateFestival.js
const validateFestival = require('./validateFestival');
// load validateFestivalEvent.js
const validateFestivalEvent = require('./validateFestivalEvent');

module.exports.validateObject = (type) => {
	return async (req, res, next) => {
		try {
			let responseFestival;
			if (type == 'validate') responseFestival = await validateFestival.validateFestival(req.body.festival, type, { id: req.params.festivalId, festivalEventId: req.params.eventId });
			else responseFestival = await validateFestival.validateFestival(req.body.festival, type);
			if (typeof responseFestival == 'string') return res.status(400).json({ message: responseFestival, token: res.locals.token });

			let responseFestivalEvent;
			if (type == 'validate') responseFestivalEvent = await validateFestivalEvent.validateFestivalEvent(req.body.event, type, { id: req.params.eventId });
			else responseFestivalEvent = await validateFestivalEvent.validateFestivalEvent(req.body.event, type);
			if (typeof responseFestivalEvent == 'string') return res.status(400).json({ message: responseFestivalEvent, token: res.locals.token });

			res.locals.validated = { festival: responseFestival, event: responseFestivalEvent };
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