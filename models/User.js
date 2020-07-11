const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Please tell us your name'],
		trim: true,
	},
	email: {
		type: String,
		require: [true, 'Provide an email'],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'Provide a valid email']
	},
	photo: {
		type: String,
		default: 'default.jpg'
	},
	role: {
		type: String,
		enum: ['admin', 'user', 'guide', 'lead-guide'],
		default: 'user'
	},
	password: {
		type: String,
		require: [true, 'Provide a password'],
		minlength: 8,
		select: false
	},
	passwordConfirm: {
		type: String,
		require: [true, 'Confirm your password'],
		validate: {
			// This only works on CREATE and SAVE
			// With CREATE and SAVE, the this variable will have the request body
			// With UPDATE, the this variable will have the request body embedded in many other attributes
			validator: function (passwordConfirm) {
				if (this.password) {
					return passwordConfirm === this.password;
				}
				return passwordConfirm === this.getUpdate().$set.password;
			},
			message: 'Passwords must match'
		},
	},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	updatedAt: {
		type: Date,
		default: Date.now()
	},
	passwordResetToken: String,
	passwordResetExpires: Date,
	active: {
		type: Boolean,
		default: true,
		select: false,
	},
});

userSchema.pre('save', async function(next) {
	// Only run this function if password was actually modified
	if (!this.isModified('password')) { return next(); } 
	
	this.password = await bcrypt.hash(this.password, 12);

	// undefined values are not persisted in the database;
	this.passwordConfirm = undefined;
	next(); 
});

userSchema.pre('save', function(next) {
	if (!this.isModified('password') || this.isNew) { return next(); }

	this.updatedAt = Date.now() - 1000; // Substracted some time to not interfere with the JWT timestamp
	next();
})

userSchema.pre(/^find/, function(next) {
	this.find({active: {$ne: false}});
	next();
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
	return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
	const updatedAtTimestamp = parseInt(this.updatedAt.getTime() / 1000, 10);
	
	return updatedAtTimestamp > JWTTimestamp;
};

userSchema.methods.createPasswordResetToken = function() {
	const resetToken = crypto.randomBytes(32).toString('hex');

	this.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// console.log(resetToken, this.passwordResetToken);

	this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // In 10 days from now on

	return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
