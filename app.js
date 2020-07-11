const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require(`./utils/AppError`);
const globalErrorHandler = require(`./controllers/errorController`);
const userRouter = require(`./routes/userRoutes`);
const tourRouter = require(`./routes/tourRoutes`);
const reviewRouter = require(`./routes/reviewRoutes`);
const bookingsRouter = require(`./routes/bookingRoutes`);
const viewRouter = require(`./routes/viewRoutes`);

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTML headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message: 'Too many requests from this IP, please try again later'
});

app.use('/api', limiter);

// Body parser, reading data form body into req.body
app.use(express.json({limit: '10kb'}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization agains XSS
app.use(xss());

// Prevent parameter pollution
app.use(
	hpp({
		whitelist: [
			'duration', 
			'ratingsQuantity',
			'ratingsAverage',
			'maxGroupSize',
			'difficulty',
			'price', 
		]
	})
);

app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	// console.log(req.cookies);
	next();
});

// Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingsRouter);

app.all('*', (req, res, next) => {
	next(new AppError(404, `Can't find ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler);

module.exports = app;
