const multer = require('multer');

// load secrets
const secrets = require(dirPath + '/api/config/secrets');

const fileSize = 1024 * 1024 * 3;

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
		cb(null, Date.now() + '_' + file.originalname);
	}
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: fileSize
	},
	fileFilter: fileFilter
});

module.exports = {
	upload: upload
};