const AppError = require('./../utils/AppError');

const sendErrorDev = (err, req, res) => {
	// API
	if (req.originalUrl.startsWith('/api')) {
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack
		});
	}
	// Rendered website
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong',
		message: err.message
	});
}

const sendErrorProd = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		// Operational, trusted error: send message to client
		if(err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});

			// Programming or other unknown error: don't leak error details
		} else {
			console.error('ERROR', err);

			return res.status(500).json({
				status: 'error',
				message: 'Something went wrong'
			});
		}
	} else if(err.isOperational) {
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong',
			message: err.message
		});

	}
	
	// Programming or other unknown error: don't leak error details
	console.error('ERROR', err);

	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong',
		message: 'Please try again later.'
	});
}

const handleCastErrorDB = err => {
	const message = `Invalid ${err.path}: ${err.value}.`;
	return new AppError(400, message);
}

const handleDuplicateFieldsDB = err => {
	const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
	const message = `Duplicate field value: ${value}. Use another value`
	return new AppError(400, message);
}

const handleValidationErrorDB = err => {
	const errors = Object.values(err.errors).map(error => error.message);
	const message = `Invalid input data. ${errors.join('. ')}`;
	return new AppError(400, message);
}

const handleJWTError = () => new AppError(401, 'Invalid token. Please log in again.');

const handleJWTExpiredError = () => new AppError(401, 'Your token has expired! Please log in again!');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = {...err};
		error.message = err.message;
		
		if (error.name === 'CastError') {
			error = handleCastErrorDB(error);
		} else if (error.code === 11000) {
			error = handleDuplicateFieldsDB(error);
		} else if (error.name === 'ValidationError') {
			error = handleValidationErrorDB(error);
		} else if (error.name === 'JsonWebTokenError') {
			error = handleJWTError();
		} else if (error.name === 'TokenExpiredError') {
			error = handleJWTExpiredError();
		}

		sendErrorProd(error, req, res);
	}
}