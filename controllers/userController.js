const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/User');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/AppError');

// const multerStorage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, 'public/img/users');
// 	},
// 	filename: (req, file, cb) => {
// 		// user-id-timestamp.fileExtention
// 		const extention = file.mimetype.split('/')[1];
// 		const filename = `user-${req.user.id}-${Date.now()}.${extention}`;
// 		cb(null, filename);
// 	}
// });
// Save file in memory (buffer)
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError(400, 'Not an Image! Please upload only images.'), false);
	}
};

const upload = multer({ 
	storage: multerStorage,
	fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
	if (!req.file) { return next(); }

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

	await sharp(req.file.buffer).
		resize(500, 500).
		toFormat('jpeg').
		jpeg({ quality: 90 }).
		toFile(`public/img/users/${req.file.filename}`);

	next();
});

exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not defined! Please use Sign Up instead'
	});
};

exports.getMe = (req, res, next) => {
	req.params.id = req.user.id;

	next();
}

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);

const filterObj = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach(el => {
		if (allowedFields.includes(el)) {
			newObj[el] = obj[el];
		}
	});
	return newObj;
}

exports.updateMe = catchAsync(async (req, res, next) => {
	const filteredBody = filterObj(req.body, 'name', 'email');
	if (req.file) {
		filteredBody.photo = req.file.filename;
	}

	const user = await User.findByIdAndUpdate(req.user._id, filteredBody, {
		new: true,
		runValidators: true
	});

	res.status(200).json({
		status: 'success',
		message: 'User data updated successfully',
		data: {
			user
		}
	});
});

exports.deleteMe = catchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, { active: false });

	res.status(204).json({
		status: 'success',
		data: null
	});
});