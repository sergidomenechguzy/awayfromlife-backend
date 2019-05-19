const multer = require('multer');

// load secrets
const secrets = require(dirPath + '/api/config/secrets');

const fileSize = 1024 * 1024 * 5;

const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png')
		cb(null, true);
	else
		cb(new Error('Only jpg and png allowed as filetype.'), false);
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, secrets.imagePath + 'images/uploads/');
	},
	filename: (req, file, cb) => {
		const newName = `${Date.now()}_${deSpecialCharacter(file.originalname)}`;
		cb(null, newName);
	}
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: fileSize
	},
	fileFilter: fileFilter
});

const fileFilterCSV = (req, file, cb) => {
	if (file.mimetype === 'text/csv')
		cb(null, true);
	else
		cb(new Error('Only csv allowed as filetype.'), false);
}

const storageCSV = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, secrets.imagePath + 'images/static');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '_csv.csv');
	}
});

const uploadCSV = multer({
	storage: storageCSV,
	limits: {
		fileSize: fileSize
	},
	fileFilter: fileFilterCSV
});

const fileFilterJSON = (req, file, cb) => {
	if (file.mimetype === 'application/json')
		cb(null, true);
	else
		cb(new Error('Only json allowed as filetype.'), false);
}

const storageJSON = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, secrets.imagePath + 'images/static');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '_json.json');
	}
});

const uploadJSON = multer({
	storage: storageJSON,
	limits: {
		fileSize: fileSize
	},
	fileFilter: fileFilterJSON
});

function deSpecialCharacter(value) {
	value = value.replace(/ /g, '_');
	value = value.replace(/\./g, '');
	value = value.replace(/,/g, '');
	value = value.replace(/\(/g, '');
	value = value.replace(/\)/g, '');
	value = value.replace(/\[/g, '');
	value = value.replace(/\]/g, '');
	value = value.replace(/\{/g, '');
	value = value.replace(/\}/g, '');
	value = value.replace(/\//g, '-');
	value = value.replace(/\\/g, '-');
	return value;
}

module.exports = {
	upload: upload,
	uploadCSV: uploadCSV,
	uploadJSON: uploadJSON,
};