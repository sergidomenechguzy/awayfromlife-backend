const escapeStringRegexp = require('escape-string-regexp');

function generate(string) {
	return new RegExp(escapeStringRegexp(string, 'i'));
}

module.exports = {
	generate: generate
};