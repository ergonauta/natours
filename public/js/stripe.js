import axios from 'axios';
const stripe = Stripe('pk_test_51H2Oj1HBcksNL9JCK5wchGqIgUjeZrNB570maFZXK9aqaOFA6nwQtJESKMXYQ2AyjXPUBkVgSoqerD0O52dC5VzH00Q5aXDJeu');
import { showAlert } from './alerts';

export const bookTour = async tourId => {
	try {
		// 1) Get checkout session from API
		const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`);

		// 2) Create checkout form + charge credit card
		await stripe.redirectToCheckout({
			sessionId: session.data.session.id
		});
	} catch (err) {
		showAlert('error', err.response.data.message);
	}

}