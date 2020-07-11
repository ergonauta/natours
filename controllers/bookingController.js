const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/Tour');
const Booking = require('./../models/Booking');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
	// Get the currently booket tour
	const tour = await Tour.findById(req.params.tourID);
	
	// Create checkout session
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		success_url: `${req.protocol}://${req.get('host')}/?tour=${tour.id}&user=${req.user.id}&price=${tour.price}`,
		cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
		customer_email: req.user.email,
		client_reference_id: req.params.tourID,
		line_items: [
			{
				name: `${tour.name} Tour`,
				description: tour.summary,
				amount: tour.price * 100,
				currency: 'usd', 
				quantity: 1
			}
		]
	});

	// Create session as response
	res.status(200).json({
		status: 'success',
		session
	});
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
	// Temporary solution | Unsecure: everyone can make bookings without paying
	const { tour, user, price } = req.query;

	if (!tour || !user || !price) { return next(); }
	await Booking.create({tour, user, price});

	res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);