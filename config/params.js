// checks if given parameters exist in request
module.exports.checkParameters = params => {
	return (req, res, next) => {
		let missingParams = [];
		params.forEach((param) => {
			if (!eval('req.body.' + param)) {
				missingParams.push(param);
			}
		});
		if (missingParams.length === 0) {
			return next();
		}
		return res.status(400).json({ message: 'Parameter(s) missing: ' + missingParams.join(', ') });
	}
}