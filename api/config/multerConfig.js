const multer = require('multer');

const fileSize = 1024 * 1024 * 3;

const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png')
		cb(null, true);
	else
		cb(new Error('Only jpg and png allowed as filetype.'), false);
}

const bandStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, './images/bands/');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '_' + file.originalname);
	}
});


module.exports.bandUpload = multer({
	storage: bandStorage,
	limits: {
		fileSize: fileSize
	},
	fileFilter: fileFilter
});