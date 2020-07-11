export const displayMap = (locations) => {
	mapboxgl.accessToken = 'pk.eyJ1IjoiZXJnbzk5NyIsImEiOiJja2JiMWx5bngwMDNkMnJsaWlpd2pvNTduIn0.Vh5_GeXbG3eJ1DTPRGdklg';

	var map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/ergo997/ckbb1pxp7084w1hoh53njd2va',
		scrollZoom: false,
	});

	const bounds = new mapboxgl.LngLatBounds();

	locations.forEach(location => {
		// Create marker
		const el = document.createElement('div');
		el.className = 'marker';

		// Add marker
		new mapboxgl.Marker({
			element: el,
			anchor: 'bottom'
		})
			.setLngLat(location.coordinates)
			.addTo(map);

		// Add popup
		new mapboxgl.Popup({
			offset: 30
		})
			.setLngLat(location.coordinates)
			.setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
			.addTo(map);

		// // Extend map bounds to include current location
		bounds.extend(location.coordinates);
	});

	map.fitBounds(bounds, {
		padding: {
			top: 200,
			bottom: 150,
			left: 50,
			right: 50
		}
	});
};