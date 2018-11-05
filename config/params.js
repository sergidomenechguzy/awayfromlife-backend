// checks if given parameters exist in request
module.exports.checkParameters = params => {
	return (req, res, next) => {
		let missingParams = [];
		params.forEach((param) => {
			if (eval('req.body.' + param) == undefined) missingParams.push(param);
		});
		if (missingParams.length === 0) return next();
		return res.status(400).json({ message: 'Parameter(s) missing: ' + missingParams.join(', ') });
	}
}

module.exports.checkListParameters = params => {
	return (req, res, next) => {
		if (!req.body.list) return res.status(400).json({ message: 'Parameter(s) missing: list' });

		let missingParams = [];
		if (
			req.body.list.some(object => {
				params.forEach((param) => {
					if (eval('object.' + param) == undefined) missingParams.push(param);
				});
				if (missingParams.length > 0) return true;
				return false;
			})
		)
			return res.status(400).json({ message: 'At least one object has the missing parameter(s): ' + missingParams.join(', ') });
		return next();
	}
}