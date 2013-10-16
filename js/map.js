/* Requires pubsub.js */

var map = function (opts) {

	/* Setting up defaults, options and globals */	
	var self = this,
		opt = {
			id: 'map-wrapper',
			zoom: 14,
			bp: 640,
			ratio: 0.33,
			init: "auto",
			geo: false,
			directions: false,
			directionsPanelId: 'directions-panel'
		};
	$.extend(opt, opts);
	self.elem = document.getElementById(opt.id);
	self.map = self.embed = self.static = false;

	/* Ititialising */
	self.init = function () {
		// Setting the padding of the wrapper to maintain aspect ratio
		self.elem.style.paddingTop = (100*opt.ratio)+'%';

		if (opt.directions)
			// Setting up directions, only if needed
			self.initDirections();

		if (!opt.geo)
			// Setting up map straigth away if not relying on GeoLocation
			self.initMap();
		else {
			// Awaiting GeoLocation if it is required
			self.getLocation();
			Events.subscribe('location'+opt.id, self.initMap);
		}
	};

	/* Abstraction for use with callback */
	self.initMap = function () {
		self.buildMap();
		self.events();
	};
	
	/* Building either embed or image, called on resize */
	self.buildMap = function () {
		// should only be called once
		if (!self.img)
			self.buildSrc();
		if (document.body.clientWidth > opt.bp) // building the needed map / image
			self.buildEmbed();
		else
			self.buildStatic();
	};
	
	/* Building up the static image src and the map it links to based on options */
	self.buildSrc = function () {
		self.img = 'http://maps.google.com/maps/api/staticmap'+
			'?center='+opt.lat+','+opt.lng+
			'&zoom='+opt.zoom+
			'&size='+opt.bp+'x'+Math.round(opt.bp*opt.ratio)+
			'&sensor=true';
		self.link = 'https://maps.google.com/maps?'+
			'f=q'+
			'&source=s_q'+
			'&hl=en'+
			'&geocode='+
			'&aq=0'+
			'&sll='+opt.lat+','+opt.lng+
			'&sspn=0.741588,2.037964'+
			'&ie=UTF8'+
			'&hq='+
			'&hnear=London+WC1N+3QA,+United+Kingdom&amp;t=m'+
			'&z='+opt.zoom+
			'&ll='+opt.lat+','+opt.lng+
			'&q='+((opt.query)? opt.query : opt.lat+','+opt.lng);
	};
	
	/* Building the static image map */
	self.buildStatic = function () {
		// should only get called once, updateStatic is use after this
		if (!self.static) {
			self.static = document.createElement('a');
			self.static.href = self.link;
			self.static.className = "map map-static";
			self.static.style.backgroundImage = 'url('+self.img+')';
			self.elem.appendChild(self.static);

			// for async map markers
			Events.publish('imgMapReady'+opt.id);
		}
	};

	/* For updating static map src and link */
	self.updateStatic = function () {
		self.static.style.backgroundImage = 'url('+self.img+')';
		self.static.href = self.link;
	};
	
	/* Creating map element and initiating google maps */
	self.buildEmbed = function () {
		// Should only get called once		
		if (!self.embed) {
			// Building the embed element
			self.embed = document.createElement('div');
			self.embed.className = "map map-embed";
			self.elem.appendChild(self.embed);
		}

		// Should only get called once
		if (!self.map) {
			// initialising the map to be accesed globally			
			self.map = new google.maps.Map(self.embed, {
				zoom: opt.zoom,
				center: new google.maps.LatLng(opt.lat, opt.lng),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});

			// setting the map if needed
			if (opt.directions)
				self.directionsDisplay.setMap(self.map);

			// For async map markers
			Events.publish('mapReady'+opt.id);
		}
	};

	/* Preparing the google maps directions functionality */
	self.initDirections = function () {
		self.directionsDisplay = new google.maps.DirectionsRenderer();
		self.directionsDisplay.setPanel(document.getElementById(opt.directionsPanelId));
		self.directionsService = new google.maps.DirectionsService();

		// Event handling for the directions form on the infowindows
		$('body').on('submit', '.directions-form', function(e) {
			e.preventDefault();
			var $this = $(this),
				destination = new google.maps.LatLng($this.find('.lat').val(), $this.find('.lng').val()),
				origin = $this.find('.directions-origin').val();

			// If no origin is specified, but geolocation is available, use this instead
			if (origin === "" && opt.geo)
				origin = new google.maps.LatLng(opt.lat, opt.lng);

			self.getDirections(origin, destination);
		});
	};

	/* Google maps directions */
	self.getDirections = function (origin, destination) {
		self.directionsService.route({
			origin: origin,
			destination: destination,
			travelMode: google.maps.TravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.IMPERIAL
		}, function(response, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				self.directionsDisplay.setDirections(response);
			} else {
				// *seriously* basic error handling
				console.log(response, status);
			}
		});
	};

	/* Adding markers to the map */
	self.addMarkers = function (markers) {
		if (!self.markers) // only once
			self.markers = [];
		// Adding the markers to a queue
		self.markers.push.apply(self.markers, markers);

		// If the map isn't ready yet
		if (!self.map) {
			// Only one async call will be made on the whole queue of markers
			if (!self.mapMarkerHandle) {
				// using map id to namespace events
				self.mapMarkerHandle = Events.subscribe('mapReady'+opt.id, function() {
					Events.unsubscribe(self.mapMarkerHandle);
					// adding markers in the queue
					self.addMapMarkers(self.markers);
				});
			}
		} else // if the map is ready, simply add the markers
			self.addMapMarkers(markers);

		// If there is no image map (basically the same as above)
		if (!self.img || !self.static) {
			if (!self.imgMarkerHandle) {
				self.imgMarkerHandle = Events.subscribe('imgMapReady'+opt.id, function() {
					Events.unsubscribe(self.imgMarkerHandle);
					self.addImgMarkers(self.markers);
				});
			}
		} else // if image map is ready simply add markers
			self.addImgMarkers(markers);
	};

	/* Adding markers to the map */
	self.addMapMarkers = function(markers) {
		var data, mark;
		markers.forEach(function(marker) {
			data = {
				map: self.map,
				position: new google.maps.LatLng(marker.lat, marker.lng),
			};

			// Only specifying an icon if there is one set
			if (marker.icon)
				data.icon = marker.icon;

			mark = new google.maps.Marker(data);

			// Info window functionality
			if (marker.info)
				// Click event
				google.maps.event.addListener(mark, 'click', function () {
					// Closing other windows
					self.infoWindow && self.infoWindow.close();
					var content = marker.info.content;
					// Conditionally adding directions form to the infoWindow content
					if (opt.directions)
						content += '<form class="directions-form">'+
							'<input type="hidden" class="lat" value="'+marker.lat+'" />'+
							'<input type="hidden" class="lng" value="'+marker.lng+'" />'+
							'<input type="text" class="directions-origin" placeholder="Your location" />'+
							'<button type="submit">Directions</button>'+
						'</form>';
					// Creating the infoWindow
					self.infoWindow = new google.maps.InfoWindow({
						content: content
					});
					self.infoWindow.open(self.map, this);
					// Padding to center on new marker
					self.map.panTo(new google.maps.LatLng(marker.lat, marker.lng));

					// If a callback was specified, fire it
					if (marker.info.callback)
						marker.info.callback(marker);
				});
		});
	};

	/* Adding markers to the static map image */
	self.addImgMarkers = function(markers) {
		// Updating the image src with each new marker
		markers.forEach(function(marker) {
			self.img += '&markers='+((marker.geo)?'color:green|':'')+marker.lat+','+marker.lng+'|';
			// self.link += '&q='+marker.lat+','+marker.lng;
		});
		// if the static map has been created already, update it
		if (self.static)
			self.updateStatic();
	};

	/* GeoLocation functions */
	self.getLocation = function () {
		navigator.geolocation.getCurrentPosition(function(position) {
			// Only update map center to geolocation if center is not set
			if (!opt.lat || !opt.lng) {
				opt.lat = position.coords.latitude;
				opt.lng = position.coords.longitude;
			}
			// Add a custom geolocation mapker to the map
			self.addMarkers([{
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				icon: "userlocation.png",
				geo: true}
			]);
			// Namespaced geolocation event
			Events.publish('location'+opt.id);
		}, function() {
			// *seriously* basic error handling
			console.log("error obtaining user location");
		}, {enableHighAccuracy: true});
	};

	/* Any events needed for the map (only added once) */
	self.events = function () {
		$(window).resize(function() {
			// Triggering build as either static or embed may not exist
			self.buildMap();
			// Triggering a resize if the map exists
			if (self.map)
				google.maps.event.trigger(self.map, "resize");
		});
	};
	
	// Self initialising unless otherwise specified
	if (opt.init === "auto")
		self.init();
};