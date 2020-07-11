const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: './config.env'});
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log('DB connection successful!');
	});

const port = process.env.PORT;
const server = app.listen(port, '127.0.0.1', () => {
	console.log(`Running on port ${port}`);
});

process.on('uncaughtException', err => {
	console.log('UNCAUGHT EXCEPTION, Shutting down...');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});

process.on('unhandledRejection', err => {
	console.log('UNHANDLED REJECTION, Shutting down...');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});