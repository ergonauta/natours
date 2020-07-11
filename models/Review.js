const mongoose = require('mongoose');
const Tour = require('./Tour');

const reviewSchema = mongoose.Schema({
	review: {
		type: String,
		required: [true, 'Review can not be empty!'],
	},
	rating: {
		type: Number,
		min: 1,
		max: 5,
	},
	createdAt: {
		type: Date,
		default: Date.now(),
	},
	updatedAt: {
		type: Date,
		default: Date.now(),
	},
	tour: {
		type: mongoose.Schema.ObjectId,
		ref: 'Tour',
		required: [true, 'Review must belong to a tour.']
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: [true, 'Review must belong to a user.']
	},
}, {
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Select which data is displayed by default
reviewSchema.pre(/^find/, function(next) {
	this.select('-__v');

	// this.populate({
	// 	path: 'tour',
	// 	select: 'name'
	// });

	this.populate({
		path: 'user',
		select: 'name photo'
	});
	
	next();
});

reviewSchema.statics.calculateAverageRatings = async function(tourId) {
	const stats = await this.aggregate([
		{
			$match: {tour: tourId}
		}, 
		{
			$group: {
				_id: '$tour',
				nRating: { $sum: 1 },
				avgRating: { $avg: '$rating' },
			}
		}
	]);

	if(stats.length > 0) {
		await Tour.findByIdAndUpdate(tourId, {
			ratingsQuantity: stats[0].nRating, 
			ratingsAverage: stats[0].avgRating
		});
	} else {
		await Tour.findByIdAndUpdate(tourId, {
			ratingsQuantity: 0, 
			ratingsAverage: 4.5
		});
	}
};

reviewSchema.post('save', function() {
	this.constructor.calculateAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
	this.queriedDocument = await this.findOne();
	next();
});

reviewSchema.post(/^findOneAnd/, async function() {
	// await this.findOne(); Does not work here, the query has already executed
	await this.queriedDocument.constructor.calculateAverageRatings(this.queriedDocument.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;