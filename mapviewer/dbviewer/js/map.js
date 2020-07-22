function getCircle(latlng,radius=5,fillcolor="#FF6633"){
		pin = L.circleMarker(latlng, {
				radius: radius,
				fillColor: fillcolor,
				color: "#663300",
				weight: 1,
				opacity: 1,
				fillOpacity: 0.8
			});
		return pin
	}
function getIcon(url='../icons/map-marker-red.png') {
		pin = L.icon({
				iconUrl: url,
				iconSize: [16, 19],
				iconAnchor: [8, 19],
				popupAnchor: [0, 0]
			});	
		return pin
}
	
function getRandomColor() {
		var letters = '0123456789ABCDEF';
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
}

function getLatLngObjList(pointsString) {
	var coordinates = pointsString.split(",")
	var latlngs=[];
	for(i=0;i<coordinates.length;i+=2){
		lat = parseFloat(coordinates[i])
		lng = parseFloat(coordinates[i+1])
		var latlng = L.latLng(lat,lng);
		latlngs.push(latlng);
	}
	return latlngs;
}
var map;
var googleStreets
var dp2
var hereMap

(
function() { 
	
	function highlightFeature(e) {
		var layer = e.target;
		layer.setStyle({
			weight: 10,
			border: 1
		});

		if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
			layer.bringToFront();
		}
	}
	function resetHighlight(e) {
		var layer = e.target;
		layer.setStyle({
			weight: 5,
			border: 1
		});
	}
	  
	$(document).ready(function() {
		var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
				'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
				'Imagery Â© <a href="http://mapbox.com">Mapbox</a>';
		var mb_gray_Url = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiamNzYW5mb3JkIiwiYSI6InRJMHZPZFUifQ.F4DMGoNgU3r2AWLY0Eni-w';
		var mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
		
		var grayscale = L.tileLayer(mb_gray_Url, {id: 'mapbox.light', maxNativeZoom: 18,maxZoom: 20, attribution: mbAttr});
		var osmStreet = L.tileLayer(mbUrl, {id: 'mapbox.streets', maxNativeZoom: 18,maxZoom: 20, attribution: mbAttr});
		googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
			maxZoom: 20,
			subdomains:['mt0','mt1','mt2','mt3'],
			attribution: 'GoogleMap'
			});

		var googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
			maxZoom: 20,
			subdomains:['mt0','mt1','mt2','mt3']
		});
		var googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
			maxZoom: 20,
			subdomains:['mt0','mt1','mt2','mt3']
		});
		hereMap = L.tileLayer('http://{s}.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?app_id=xWVIueSv6JL0aJ5xqTxb&app_code=djPZyynKsbTjIUDOBcHZ2g',{
			maxZoom: 20,
			subdomains:['1','2','3','4']
		});
		dp2 = L.tileLayer('http://autodenali-rastercdn.telenav.com/maps/v4/rastertile?x={x}&y={y}&zoom={z}',{ 
			id: 'dp2', 
			maxZoom: 20,
			maxNativeZoom: 17,
			attribution: 'tnnav denali product 2 @ Here 16Q4'});  
		var markers = new Array();
		var lines = new Array();
		var geojsonLayer = new L.GeoJSON(null, {
			  style: function (feature) {
				  featureColor = "#BB0000"
				  if (feature.properties.color)
					  featureColor = feature.properties.color
				return {color: featureColor};
			  },
			  pointToLayer: function (feature, latlng) {
				  marker='map-marker-red.png'
				  guidanceType = ''
				  if(feature.properties)
				  {
					  if (feature.properties.turnType) {
						  guidanceType=feature.properties.turnType+"_"
					  }
					  if (feature.properties.marker) {
						  marker=feature.properties.marker
					  }
				  }
				  pin = getIcon(marker, guidanceType);  
				  aMarker = L.marker(latlng)
				  return aMarker;
			  },
			  onEachFeature: function (feature, layer) {
				layer.on({
					mouseout: resetHighlight,
					mouseover: highlightFeature
				});

				var latlongString = '';

				if (feature.geometry && feature.geometry.type == 'Point') {
					latlong = layer.getLatLng();
					latlongString = latlong.lat + "," + latlong.lng 
				}
				if (feature.properties) {
					var popupString = '<div class="popup">';
					for (var k in feature.properties) {
						var v = feature.properties[k];
						popupString += k + ': ' + v + '<br />';
					}

					popupString += latlongString + '</div>';
					layer.bindPopup(popupString, {
					maxHeight: 200
				  });
				}
			  }
			}); 
		
		map = L.map('map-container',{ layers: [dp2,geojsonLayer] });
		map.setView([37.397207,-121.977096], 15);
		var baseLayers = {
			"OSM_gray": grayscale,
			"OSM": osmStreet,
			"DP2_HERE": dp2,
			"Here": hereMap,
			"google": googleStreets
		};

		var overlays = {
			"geojsonLayer": geojsonLayer,
			"googleSat": googleSat,
			"googleTerrain": googleTerrain
		};

		lcontrol = L.control.layers(baseLayers, overlays,{collapsed:true}).addTo(map);
		
		var popup = L.popup();

		function onMapClick(e) {
			var msg=""
			dbhost=$('#dbhost').val();
			dbname=$('#dbname').val();
			region=$('#region').val();
			latlngString=e.latlng.lat.toFixed(6)+","+e.latlng.lng.toFixed(6);
			if(dbhost && dbname){
				if ($('#auto_select_road').is(':checked')) {
					queryWayID(dbhost,dbname,latlngString,region)
					return;
				}else{
					msg+="<br><a href='#' onclick='queryWayID(dbhost,dbname,latlngString,region)'>map to road</a>"
				}
			}
			popup
				.setLatLng(e.latlng)
				.setContent(latlngString + msg)
				.openOn(map);
		};

		map.on('click', onMapClick);

		function inrange(min,number,max){
			if ( !isNaN(number) && (number >= min) && (number <= max) ){
				return true;
			} else {
				return false;
			};
		}
		
		$('#submit').on('click', function() {
			if ($('#geojson-input').val().length < 1) {
				return;
		  	}

			var testJson = trimQuotes($('#geojson-input').val());
			var reg = new RegExp("^\{");
			
			//latlng lists
			if( !reg.exec(testJson) ) {
				var pointsList = testJson.split("\n")
				try {
					
					if ($('#clear-current').is(':checked')) {
						for(i=0;i<markers.length;i++)
							map.removeLayer(markers[i])
						for(i=0;i<lines.length;i++)
							map.removeLayer(lines[i])
					}
					
					var alllatlngs=[];
					for( n=0;n<pointsList.length;n++)
					{
						points=trimQuotes(pointsList[n].trim());
						if(points.length==0)
							continue
						var coordinates = points.split(",")
						var latlngs=[];
						for(i=0;i<coordinates.length;i+=2){
							if(coordinates[i].length==0)
								continue
							lat = parseFloat(coordinates[i])
							lng = parseFloat(coordinates[i+1])
							var latlng = L.latLng(lat,lng);
							var marker = getCircle(latlng,3);
							markers.push(marker)
							marker.addTo(map)
							latlngs.push(latlng);
							alllatlngs.push(latlng);
						}
						var line = L.polyline(latlngs, {color: getRandomColor()});
						lines.push(line)
						line.addTo(map);
					}
					map.fitBounds(L.polyline(alllatlngs).getBounds())
				} catch(e) {
						$('#modal-message-body').html(e.message);
						$('#modal-message-header').html('Invalid latlon list');
						$('#modal-message').modal('show');
				}
			} else { //geojson format
 				var errors = geojsonhint.hint(testJson);
				if (errors.length > 0) {

					var message = errors.map(function(error) {
					return 'Line ' + error.line + ': ' + error.message;
					}).join('<br>')

					$('#modal-message-body').html(message);
					$('#modal-message-header').html('Invalid GeoJSON');
					$('#modal-message').modal('show');
				} else {
					if ($('#clear-current').is(':checked')) {
						geojsonLayer.clearLayers();
					}
					geojsonLayer.addData(JSON.parse(testJson));
					map.fitBounds(geojsonLayer.getBounds());
				}
			}
		  	
		});
		function trimQuotes(input){
			if( typeof(input) == "string"){
				if(input[0]=="\"")
					input=input.substr(1);
				if(input[input.length-1]=="\"")
					input=input.slice(0,-1);
			}
			return input 
		}
		$('#clear').on('click', function() {
		  $('#geojson-input').val('');
		});
		
		
		function showGeoJsonSample(geojsonType) {
      		$('#geojson-input').val(JSON.stringify(window[geojsonType], null, 6));
    	}

		$('a[data-toggle="tab"]').on('click', function(event) {
      		showGeoJsonSample($(event.target).attr('data-geojson-type'));
      		$('#submit').trigger('click');
    	});
		$('#latlngbtn').on('click', function() {
		  $('#geojson-input').val(window['latlngString']);
		 $('#submit').trigger('click');
		});
		$('.modal-close').on('click', function(event) {
      		event.preventDefault();
      		$('#' + $(this).attr('id').split('-close')[0]).modal('hide');
    	});
	
		$('#distance').on('click', function() {
			pointsString = $('#distance_endpoints').val();
		 	if(pointsString.length==0)
				return;
			var coordinates = pointsString.split(",")
			var latlngs=[];
			var distance=0;
			for(i=0;i+2<coordinates.length;i+=2){
				var p1 = new google.maps.LatLng(coordinates[i],coordinates[i+1]);
				var p2 = new google.maps.LatLng(coordinates[i+2],coordinates[i+3]);
				distance += google.maps.geometry.spherical.computeDistanceBetween(p1, p2)
			}
			unit="Meters"
			if(distance>16093){
				distance=distance/1609.34
				unit="miles"
			}
			$('#distance').html(distance.toFixed(1)+" " + unit)
		});
		
		});
}());