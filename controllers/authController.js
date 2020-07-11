const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/User');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const Email = require('./../utils/email');
const { runInNewContext } = require('vm');

const signToken = id => {
	return jwt.sign({
		id
	}, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	});
}

const createSendToken = (user, statusCode, res) => {
	const token = signToken(user._id);
	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIERS_IN * 24 * 60 * 60 * 1000 // Convert days to ms
		),
		httpOnly: true, // Cannot be accessed or modified in the browser
	};

	if (process.env.NODE_ENV === 'production') {
		cookieOptions.secure = true; // Cookie only sent on secure connections
	}

	res.cookie('jwt', token, cookieOptions);

	user.password = undefined;

	res.status(statusCode).json({
		status: 'success',
		token,
		data: {
			user
		}
	})
}

exports.logout = (req, res) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});
	res.status(200).json({ status: 'success' });
}

// eslint-disable-next-line no-unused-vars
exports.signup = catchAsync(async (req, res, next) => {
	const user = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
	});
	const url = `${req.protocol}:${req.get('host')}/me`;
	// console.log(url);
	await new Email(user, url).sendWelcome();

	createSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return next(new AppError(400, 'Please provide email and password'));
	}

	const user = await User.findOne({ email }).select('+password');

	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError(401, 'Incorrect email or password'));
	}

	createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
	let token = req.headers.authorization;
	if (token && token.startsWith('Bearer')) {
		token = token.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	} else {
		return next(new AppError(401, 'You are not logged in. Please log in to get access.'));
	}

	// Verification token
	const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// Check if user still exists
	const user = await User.findById(decodedToken.id);
	if (!user) { return next(new AppError(401, 'The user belonging to this token no longer exist.')) }

	// Check if user changed password after the token was issued
	if (user.changedPasswordAfter(decodedToken.iat)) {
		return next(new AppError(401, 'User recently changed password! Please log in again.'))
	}

	req.user = user;
	res.locals.user = user;
	next();
});

// Only for rendered pages, no errors.
exports.isLoggedIn = catchAsync(async (req, res, next) => {
	try {
		if (req.cookies.jwt) {
			// Verification token
			const decodedToken = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

			// Check if user still exists
			const user = await User.findById(decodedToken.id);
			if (!user) { return next(); }

			// Check if user changed password after the token was issued
			if (user.changedPasswordAfter(decodedToken.iat)) {
				return next();
			}

			// There is a logged in user
			res.locals.user = user;
			return next();
		}
		return next(); 
	} catch (e) {
		return next();
	}
});

exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		if(!roles.includes(req.user.role)) {
			return next(new AppError(403, 'You do not have permission to perform this action.'));
		}

		next();
	}
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
	// Get user based on POSTed email
	const user = await User.findOne({email: req.body.email});
	if (!user) { return next(new AppError(404, 'There is no user with that email address.'))}

	// Generate random reset token
	const resetToken = user.createPasswordResetToken();
	await user.save();

	// Send it back to user email
	try {
		const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
		await new Email(user, resetURL).sendPasswordReset();
	
		res.status(200).json({
			status: 'success',
			message: 'Token sent to email',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		user.save();

		// console.log(err);
		return next(new AppError(500, 'There was an error sendig the email. Please try again later'));
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// Get user based on token
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		passwordResetToken: hashedToken, 
		// passwordResetExpires: {$gt: Date.now()}
	});

	// If token has not expired, and there is a user, set the new password
	if (!user) {
		return next(new AppError(400, 'Token is invalid or has expired.'));
	}
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();

	// Log the iser in (sent JWT)
	const token = signToken(user._id);
	res.status(200).json({
		status: 'success',
		token
	});
});

exports.updatePassword = catchAsync(async (req, res, next) => {
	const {password, newPassword, newPasswordConfirm} = req.body;

	// Get user from collection
	const user = await User.findOne(req.user._id).select('+password');

	// Check if POSTed current password is correct
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError(401, 'Incorrect password'));
	}

	// If so, update password
	if (!newPasswordConfirm) {
		return next(new AppError(401, 'No password confirm provided'));
	}
	user.password = newPassword;
	user.passwordConfirm = newPasswordConfirm;
	await user.save();

	// Log user in, send JWT
	createSendToken(user, 200, res);
});

