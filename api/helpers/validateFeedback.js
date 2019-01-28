// validate all attributes for feedback objects in the request body
module.exports.validateObject = () => {
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