var geoMap, basicMap, directionsMap;

$(function(){
	basicMap = new map({
		lat: 51.521268,
		lng: -0.11727
	});

	geoMap = new map({
		id: 'geo-map-wrapper',
		ratio: 0.75,
		zoom: 13,
		geo: true,
		lat: 51.521268,
		lng: -0.11727,
		query: "stuff in the area"
	});

	geoMap.addMarkers([
		{
			lat: 51.521268,
			lng: -0.11727,
			info: {
				content: "marker 1"
			}
		},{
			lat: 51.522268,
			lng: -0.11827,
			info: {
				content: "marker 2",
				callback: function (marker) {
					console.log("callback for "+ marker.info.content);
				}
			}
		}
	]);

	directionsMap = new map({
		id: 'directions-map-wrapper',
		ratio: 0.75,
		geo: true,
		zoom: 14,
		query: "micros ecommerce",
		directions: true,
		directionsPanelId: 'directions-panel'
	});

	directionsMap.addMarkers([
		{
			lat: 51.521268,
			lng: -0.11727,
			info: {
				content: "marker 1"
			}
		},{
			lat: 51.522268,
			lng: -0.11827,
			info: {
				content: "marker 2",
				callback: function (marker) {
					console.log("callback for "+ marker.info.content);
				}
			}
		}
	]);
});