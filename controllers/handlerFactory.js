const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const APIFeatures = require('./../utils/APIFeatures');

exports.deleteOne = Model => 
	catchAsync(async (req, res, next) => {
		const document = await Model.findByIdAndDelete(req.params.id);

		if (!document) {
			return next(new AppError('No document found with that ID', 404));
		}

		res.status(204).json({
			status: 'success',
			data: null,
		});
	});

exports.updateOne = Model => 
	catchAsync(async (req, res, next) => {
		const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
			runValidators: true,
			new: true,
			context: 'query',
		});

		if (!document) {
			return next(new AppError('No document found with that ID', 404));
		}

		res.status(200).json({
			status: 'success',
			data: {
				document,
			},
		});
	});

exports.createOne = Model => 
	catchAsync(async (req, res, next) => {
		const document = await Model.create(req.body);

		if (!document) {
			return next(new AppError('No document found with that ID', 404));
		}

		res.status(201).json({
			status: 'success',
			data: {
				document,
			},
		});
	});

exports.getOne = (Model, populateOptions) => 
	catchAsync(async (req, res, next) => {
		let query = Model.findById(req.params.id);
		if (populateOptions) { query = query.populate(populateOptions); }
		const document = await query;

		if (!document) {
			return next(new AppError(404, 'No document found with that ID'))
		}

		res.status(200).json({
			status: 'success',
			data: {
				document,
			},
		});
	});

exports.getAll = Model => 
	catchAsync(async (req, res, next) => {

		// To allow for nested GET reviews on tour
		let filter = {};
		if (req.params.tourId) { filter = { tour: req.params.tourId }; }

		const features = new APIFeatures(Model.find(filter), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		// const documents = await features.query.explain();
		const documents = await features.query;

		res.status(200).json({
			status: 'success',
			results: documents.length,
			data: {
				documents,
			},
		});
	});