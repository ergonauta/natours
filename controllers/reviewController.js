const Review = require('./../models/Review');
const factory = require('./handlerFactory');

// eslint-disable-next-line no-unused-vars

exports.setTourUserIds = (req, res, next) => {
	if(!req.body.tour) { req.body.tour = req.params.tourId; }
	if(!req.body.user) { req.body.user = req.user.id; }
	
	next();
}

exports.getReview = factory.getOne(Review);
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);