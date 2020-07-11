const Tour = require('./../models/Tour');
const User = require('./../models/User');
const Booking = require('./../models/Booking');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');

exports.getOverview = catchAsync(async (req, res, next) => {
	const tours = await Tour.find();
 
	res.status(200).render('overview', {
		title: 'All Tours', 
		tours
	});
});

exports.getTour = catchAsync(async (req, res, next) => {
	const tour = await Tour.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		fields: 'review rating user'
	});

	if (!tour) {
		return next(new AppError(404, 'There is no tour with that name'));
	}

	res.status(200).render('tour', {
		tour
	});
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
	res.status(200).render('login', {
		title: 'Log into you account'
	});
});

exports.getAccount = (req, res) => {
	res.status(200).render('account', {
		title: 'Your account'
	});
};

exports.getMyTours = catchAsync(async (req, res, next) => {
	// Find bookings
	const bookings = await Booking.find({ user: req.user.id });

	// Find tours with the returned ID's
	const tourIDs = bookings.map(booking => booking.tour.id);
	const tours = await Tour.find({ _id: {$in: tourIDs } });

	res.status(200).render('overview', {
		title: 'My Tours',
		tours
	});
});

exports.updateUserData = catchAsync(async (req, res, next) => {
	const updatedUser = await User.findByIdAndUpdate(req.user.id, {
		name: req.body.name,
		email: req.body.email
	}, {
		new: true,
		runValidators: true
	});

	res.status(200).render('account', {
		title: 'Your account',
		user: updatedUser
	});
});