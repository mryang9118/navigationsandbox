/* Created by Gagan - July,2017 */

  var config = {
        '.chosen-select': {},
        '.chosen-select-deselect': {allow_single_deselect: true},
        '.chosen-select-no-single': {disable_search_threshold: 10},
        '.chosen-select-no-results': {no_results_text: 'Oops, nothing found!'},
        '.chosen-select-width': {width: '100%'}
    };
    //=============================================================================
    // Description: Global variable
    // Author: Chen Yang
    // Created: 02/16/2017
    // Last Modified: 02/17/2017
    //=============================================================================
    var gDestinationMaker = null;
    var gOriginMaker = null;
    var gWaypointMaker = null;
    var gGuidanceMarkers = [];
    var pageUrl;

    var gPolyline = null;
    var gPolylineArray = [];
    var gMultiplePolylines = [];

    // Need to be cleaned each time
    var gRoutes = {};
    var gCurrentBounds;

    var edgeOptions = {
        color: 'blue',
        weight: 4,
        opacity: 0.5,
    };
    var routeArray;

    var edgeGroup ;
    var makerGroup ;
    var routeInfo;
    var mapMarkers = [];
    var mapEdges = [];
    var mapEdgeArrow = [];
   // var timeVal ;
    var setColArray = [];
    var bShowTraffic = false;
    var flagMeter = false; //show distance in meter : default set to Miles
    var maneuverMaker;

    var dataC ={};
    var markerSize = [0,0];
    var countServer = 0;

    var myJSON = [];
    var originVal ;
    var destinationVal;
    var timeZoneUrl = "";
    var timeValUtc ="" ;
    var originLocalDateTime ="";
    var multipleMode = false;
    var makersData =  [];
    var guidanceArray = [];
    var modeArray = [];
    var modeId = "";
    var routeNoArray =[];
    var flagDoItOnce = false;
    var flagReverseOD = true;
    var wayPtMode = false;
    var totalRequest = 0;
    var gmtOffsetVal;

    var maxWaypoint = 3;
    var numberOfWaypoints = 0;
    // var waypointInput = '<input class="location-input" id="waypoint-input" type="text" placeholder="waypoint">';
    var waypointButton = '<button id="waypoint-delete" class="fa fa-times fa-x"></button>';
    var waypointValGoogle =[];
    var distFromGoogleServer= parseInt(0);
  //  directionsService = new google.maps.DirectionsService();
  //  directionsDisplay = new google.maps.DirectionsRenderer();
    var polylineGoogle="";
      
    var delay_time_google=parseInt(0);
    var telenavRouteSummary = [];
    var delayTelenavTotal = parseInt(0);
    var distanceTelenavTotal =parseInt(0);
    var durationTelenavTotal =parseInt(0);

    var multipleServer = false;
    var multipleServerAnalytics = false;
    var flagShowLiveTraffic = false;
    var flagShowHistoricalTraffic = false;
    
    //var colorArray = ['pink', 'blue', 'orange', 'parrot green', 'violet/purple', 'ferozi blue', 'purple shade', 'dark blue', '#FFBF00', 'blue', 'black']; 
    var colorArray = ['#ff6bff', '#1C3BFF', '#FF8300', '#00FF3B', '#E32574', '#55DFFF', '#D703ED', '#263052', '#FFBF00', 'blue', 'black'];
    var colorArrayServers = [];
    colorArrayServers.push( {'color':'#ff6bff','checked':false},{'color':'#1C3BFF','checked':false},{'color':'#FF8300','checked':false},{'color':'#00FF3B','checked':false},
        {'color':'#E32574','checked':false},{'color':'#55DFFF','checked':false},{'color':'#D703ED','checked':false},{'color':'#263052','checked':false},
        {'color':'#FFBF00','checked':false},{'color':'#FF3F01','checked':false},{'color':'#FF1300','checked':false},{'color':'#01FF3B','checked':false});
    var colorCodeArray = [];
    var urlArray = [];

	$(function() {
		var directionsService = new google.maps.DirectionsService();
		var directionsDisplay = new google.maps.DirectionsRenderer();
	});

    var dataTest = {
    "pairs":[
            {   "origin":{
                            "lat":37.39801,
                            "lng":-121.97749
                        } ,
                "destination":{
                            "lat":37.38694,
                            "lng":-122.00555
                        }
            },
            {   "origin":{
                            "lat":37.40364,
                            "lng":-121.96764
                        } ,
                "destination":{
                            "lat":37.38694,
                            "lng":-122.00555
                        }
            }
        ]
    };
  
	function createJiraLink(caseText) {
		var key = "jira:"
		caseText = caseText.trim()
		if(caseText.startsWith(key)){
			caseText=caseText.trim().replace(key, "")
			return "<a target=\"_blank\" href = 'http://jira.telenav.com:8080/browse/" + caseText + "'>"+caseText+"</a>"
		}
		return caseText
	}

   function loadJson (){    
      document.getElementById("pairs").innerHTML = "";
         //testing URL
        //http://ec2s-autodenali-ngxtile-na01.mypna.com/map/WebTool_V1/NextGenerationWebTool/sample.txt
        if($('#loadUrl').val() !=""){
         $.ajax({
            type: 'GET',
            url: $('#loadUrl').val(),
            contentType: "text/plain",
            withCredentials:false,
            success: function (data) {
         //       var dataTxt = "42.137110,-83.220069,42.425522,-83.253253";
                var arrayPair = data.trim().split("\n");
                for(var i = 0;i<arrayPair.length;i++){
					var jiraString = ""
                   	var pairInf =  arrayPair[i].split(",");
					if(pairInf.length<4)
						continue;
					var text = pairInf[0].trim()+","+pairInf[1].trim()
					if(pairInf.length>4)
						jiraString = pairInf[4].trim()
                   	document.getElementById("pairs").innerHTML += "<a id='OD"+i+"' onclick=submitJSON("+pairInf[0].trim()+","+pairInf[1].trim()+","+pairInf[2].trim()+","+pairInf[3].trim()+",OD"+i+")>" + i + ": " + text + "</a> " + createJiraLink(jiraString)+ "<br>"; 
                 }
            },
            error: function (e) {
                console.log("server is down:"+e );
            }
        });
     }
        
    }

    function submitJSON(originLat,originLng,destLat,destLng,odId) {

        if( document.getElementById('pairSummary') != undefined)
            document.getElementById('pairSummary').remove();

        if( document.getElementById('pairSummaryGoogle') != undefined)
            document.getElementById('pairSummaryGoogle').remove();

        removeEdges();
        removeMarkers();
        removeEdgeArrow();
        colorArrrayServerReset();

        var finalUrl = "/more/directions/";

        var versionSelected = "V4" ; 
       // var modeArrayJson = ["fastest"];

        var latlngDefaultOrigin = {};
        latlngDefaultOrigin.latlng = {};
        latlngDefaultOrigin.latlng = {'lat':parseFloat(originLat),'lng':parseFloat(originLng)};
        setOrigin(latlngDefaultOrigin);

        var latlngDefaultDest = {};
        latlngDefaultDest.latlng = {};
        latlngDefaultDest.latlng = {'lat':parseFloat(destLat),'lng':parseFloat(destLng)};
        setDestination(latlngDefaultDest);

        var maxRoute = $('#max-route-number-selector').val();
        var showTrafficVal = $('#traffic-selector').val();

        var flagShowLiveTraffic = false;
        var flagShowHistoricalTraffic = false;


          $('#traffic-selector').change(function(){
           $('#traffic-selector :selected').each(function(){
                if($(this).val() == "1"){
                    $('#divUtcTime').hide(); 
                    $('#divOriginTime').hide();
					var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.clear();
                }
                if($(this).val() == "2"){
                     $('#divUtcTime').show(); 
                     $('#divOriginTime').show();
                      flagShowLiveTraffic = true;
                    flagShowHistoricalTraffic = false;
                    document.getElementById("timeUTC").disabled = true;
                    document.getElementById("timeOrigin").disabled = true; 
                    var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.setValue("traffic");
                  //  $("#avoid").val("traffic");
                }
                if($(this).val() == "3"){
                     $('#divUtcTime').show(); 
                     $('#divOriginTime').show();
                    flagShowHistoricalTraffic = true;
                    flagShowLiveTraffic = false;
                    document.getElementById("timeUTC").disabled = false;
                    document.getElementById("timeOrigin").disabled = true; 
                    var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.setValue("traffic");
                }
           });
        });

        var constPara = "&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=1&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true";

        finalUrl += versionSelected + "/json?&origin="+originLat+","+originLng+"&destination="+destLat+","+destLng+"&time="+timeValUtc+"&api_version="+versionSelected;

        if(maxRoute != undefined && maxRoute != "")
            finalUrl += "&max_route_number="+maxRoute;

          var avoidVal ="";
        if($("#avoid").val() != ""){
            $.each($("#avoid :selected"),function(){
                avoidVal = avoidVal + ($(this).val())+",";
                finalUrl += "&avoid="+avoidVal ;
            });
        }

        var modeVal ="";
        if($("#mode").val() != ""){
            $.each($("#mode :selected"),function(){
                modeVal = modeVal + ($(this).val())+",";

            });
             finalUrl += "&mode="+modeVal;
        }

         $('#mode').change(function(){
           $('#mode :selected').each(function(){
                if($(this).val() == "eco"){
                  $('#ecoCurve').show(); 
                }
                if($(this).val() != "eco"){
                  $('#ecoCurve').hide(); 
                }
                  
           });
        });


        var eco_curve_id = $("#eco_curve_id :selected").text();
        if (eco_curve_id != null && eco_curve_id.length != 0) {
            finalUrl += "&eco_curve_id=" + eco_curve_id;
        }
           
        finalUrl += "&show_traffic="+flagShowLiveTraffic+"&show_historical_traffic="+flagShowHistoricalTraffic ;

        countServerAnalytics =0;
         multipleServerAnalytics = false;
        $('#server :selected').each(function (i, selected) {
            var currentServer = $(selected).attr('value');
            if (currentServer !== undefined && currentServer !== false && currentServer.length > 0) {

                label = $(selected).attr('label');
                if (i == 0)
                    server = $(selected).attr('label');
                else
                    server = server + "," + $(selected).attr('label');

                countServerAnalytics++;

                if(countServerAnalytics >1){
                    multipleServerAnalytics = true;
                //    multipleServer = false;
                }

                finalUrl += "&server="+currentServer ;                         
                    if (currentServer === "google") { 
                            calcGoogleRoute();   
                            document.getElementById(odId.id).innerHTML += "<output id='pairSummaryGoogle' style='color: #00bfff;visibility: show;font-size:12px'></output>" ;
                    }

                    else {
                        // iterate each route style
                        modeArray = [];
                        if($("#mode").val() != ""){
                            modeArray = $('#mode').val();
                        }

                        var uniqueUrl = "http://"+currentServer+finalUrl;    
                        var col = getColor();

                        // multiple mode and multiple route logic
                        if(modeArray.length >1){
                            multipleMode = true ;                      
                            //Work on cleaning sidePanel and colorCode of Route numbers
                            redrawGuidanceSideTabs();
                            drawMultiModeRoutes(0, modeArray, uniqueUrl,constPara,multipleMode,wayPtMode,"",col);

                            if(document.getElementById('pairSummary') === null)
                            	document.getElementById(odId.id).innerHTML += "<output id='pairSummary' style='visibility: show; font-size:12px'></output>" ;
                        }
                        else{
                            multipleMode = false;
                            redrawGuidanceSideTabs();
                            drawMultiModeRoutes(0, modeArray, uniqueUrl,constPara,multipleMode,wayPtMode,"",col);

                            if(document.getElementById('pairSummary') === null)
                            	document.getElementById(odId.id).innerHTML += "<output id='pairSummary' style='visibility: show;font-size:12px'></output>" ;
                        }

                    }
                         
            }
        });
    }
   
   function colorArrrayServerReset(){
        for(var i=0;i<colorArrayServers.length;i++)
                    colorArrayServers[i].checked = false;
   }


    $(document).keypress(function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            colorArrrayServerReset();
            loadJson();
            submitForm();
        }
         
    });

  $('#mode').selectize({
    plugins: ['remove_button'],
    delimiter: ',',
    persist: false,
    create: function(input) {
        return {
            value: input,
            text: input
        }
    }
    });

  $('#avoid').selectize({
    plugins: ['remove_button'],
    delimiter: ',',
    persist: false,
    create: function(input) {
        return {
            value: input,
            text: input
        }
    }
    });

  $('#server').selectize({
    plugins: ['remove_button'],
    delimiter: ',',
    persist: false,
    create: function(input) {
        return {
            value: input,
            text: input
        }
    }
    });

    //=============================================================================
    // Description: Jquery related functions
    // Author: Chen Yang
    // Created: 02/16/2017
    // Last Modified: 02/17/2017
    //=============================================================================


    $(document).ready(function () {

      $('#add-waypoint').click(function () {
            if (numberOfWaypoints < maxWaypoint) {
                numberOfWaypoints++;
                var div = "<div> <input class='location-input' id='waypoint-input"+numberOfWaypoints+"' type='text' placeholder='waypoint'>"+waypointButton+"</div>";
                $("#waypoint").append(div);
            }
        });

        $("body").on("click", "#waypoint-delete", function () {
            $(this).parent("div").remove();
            numberOfWaypoints--;
            if(numberOfWaypoints==0)
                removeMaker(gWaypointMaker);
        });

        $( function() {
            $( "#tabs" ).tabs();
        } );

      /*  $("#options").click(function () {
            $("#options-menu").slideToggle();

        });
        */

        var obj;

        $(".routes-table-row").on({
              click: function () {
                 if (obj != null) {
                    obj.css("background-color", "white");
                    obj.css("color", "black");
                }

                obj = $(this);
                obj.css("background-color", "#767c84");
                obj.css("color", "white");

                $("#routes-details").slideToggle();
            }
        });

       originVal = $('#origin-input').val().replace(/ /g,"");
       //destinationVal = $('#destination-input').val();
        updateTimeFields();
        //call when page gets loaded to show default route from Origin to destination
        submitForm();

    });

    function updateTimeFields(){
         var originVal = $('#origin-input').val().split(",") ; 
         timeZoneUrl =   "http://api.timezonedb.com/v2/get-time-zone?key=JQUHJ8S49GJL&format=json&lat="+originVal[0]+"&lng="+originVal[1]+"&by=position" ;
        // console.log("vals -"+originVal);
         callTimeZoneDbAPI(timeZoneUrl,function(){

            if(originLocalDateTime !=""){
                setOriginDate(originLocalDateTime);
                var dateTimeVal = moment();
              
                //for historic traffic UTC date is editable field.Pass that date to final prepared URL
                if(flagShowHistoricalTraffic){
                   var utcSetDate = [];
                   utcSetDate = $("#timeUTC").val().split(" ");
                   timeValUtc = utcSetDate[0]+"T"+utcSetDate[1]+"Z";
                  // setUtcDate(utcSetDate[0]+"T"+utcSetDate[1]+"Z");
                }
                else{
                      timeValUtc = dateTimeVal.utc().format();
                    setUtcDate(dateTimeVal.utc().format('YYYY-MM-DD HH:mm:ss'));
                }
            }

        });
    }

    var route;
    function loadFile() {
        var file = document.querySelector('input[type=file]').files[0];
        var reader = new FileReader();

        reader.addEventListener("load", function () {
            var jsonData = JSON.parse(reader.result);      
            route = drawRoute(jsonData, name, colorArray,false,0,false,"","");  
            console.log("File Load: "+route);
        });

        if (file) {
            reader.readAsText(file);
        }
    }


    //=============================================================================
    // Description: Map related functions
    // Author: Chen Yang
    // Created: 02/16/2017
    // Last Modified: 02/17/2017
    //=============================================================================
    // Initialize map setting, include zooming control, center, zooming and context menu
    var mapOptions = {
        center: [37.398082, -121.977475],
        zoom: 12, // initial zoom of map
        minZoom: 2,
        maxZoom: 20,
        zoomControl: true,
        contextmenu: true,
        contextmenuWidth: 140,
        contextmenuItems: [{
            text: 'Set Origin',
            iconCls: 'fa fa-map-marker fa-lg',
            callback: setOrigin,
        }, '-', {
            text: 'Set Destination',
            iconCls: 'fa fa-map-marker fa-lg',
            callback: setDestination
        }, '-', {
            text: 'Add Waypoint',
            iconCls: 'fa fa-map-marker fa-lg',
            callback: addWaypoint
        }, '-', {
            text: 'Get LatLng',
            iconCls: 'fa fa-map-marker fa-lg',
            callback: showCoordinates
        }, '-', {
            text: 'Get Address',
            iconCls: 'fa fa-map-marker fa-lg',
            callback: showCoordinates
        }]
    };

    // Initialize a map
    var map = L.map('map', mapOptions);
    var legend;
     
    //Legend Added - Author(Gagan)
    function updateLegend(setColArray){

        if(legend != undefined)
            map.removeControl(legend);

        console.log("setColArray:"+setColArray);
        legend = L.control({position : 'bottomright'});
            legend.onAdd = function(map){
                var div = L.DomUtil.create('div', 'legend');
                var labels = [
                    "Green : No Traffic", 
                    "Yellow : Medium Traffic", 
                    "Red : Heavy Traffic"
                ];
                var grades = [100000001, 50000001, 50000000];
                div.innerHTML = '<div><b>Legend</b></div>';
                for(var i = 0; i < grades.length; i++){
                    div.innerHTML += '<i style="background:' 
                    + grades[i] + '">&nbsp;&nbsp;</i>&nbsp;&nbsp;'
                    + labels[i] + '<br />';
                }
                return div;
            }

            legend.addTo(map);
         
    }

   
    // Add country select
    var select = L.countrySelect().addTo(map);
    select.on('change', function (e) {
        //No action when the first item ("Country") is selected
        if (e.feature === undefined) {
            return;
        }

        var country = L.geoJson(e.feature);
        map.fitBounds(country.getBounds());
    });

    //    select.setPosition("topright");

    // Switch base layer in different coordinator
    map.on('baselayerchange', function (e) {
        console.log('Base Layer Change');
        if (e.layer != baiduRoadMap && e.layer != baiduSatellite) {
            if (map.options.crs != L.CRS.EPSG3857) {
                map.options.crs = L.CRS.EPSG3857;
                map.removeLayer(e.layer);
                map.addLayer(e.layer);
                map.setView([37.398082, -121.977475], 12);
                if (gCurrentBounds != null) map.fitBounds(gCurrentBounds.pad(0.08));
                else map.setView([37.398082, -121.977475], 12);
            }

            if (e.layer != googleRoadmap || e.layer != googleSatellite || e.layer != googleHybrid) {
                map.setMaxZoom(18);
            }
            else {
                map.setMaxZoom(20);
            }
        }
        else if (e.layer == baiduRoadMap || e.layer == baiduSatellite) {
            if (map.options.crs != L.CRS.EPSGB3857) {
                map.options.crs = L.CRS.EPSGB3857;
                map.removeLayer(e.layer);
                map.addLayer(e.layer);
                map.setMaxZoom(18);
                if (gCurrentBounds != null) map.fitBounds(gCurrentBounds.pad(0.08));
                else map.setView([31.206329, 121.398852], 12);
            }
        }
    });

    // Initialize OSM
    var osmRoadMap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
    });

    // initialize TN DP2 
    var dp2 = L.tileLayer('http://autodenali-rastercdn.telenav.com/maps/v4/rastertile?x={x}&y={y}&zoom={z}',{ 
            id: 'dp2', 
            maxZoom: 20,
            maxNativeZoom: 17,
            attribution: 'tnnav denali product 2 @ Here 16Q4'});  


    // Initialize Google map and set to default
    var googleRoadmap = L.gridLayer.googleMutant({
        maxZoom: 24,
        type: 'roadmap'
    }).addTo(map);
    var googleSatellite = L.gridLayer.googleMutant({
        maxZoom: 24,
        type: 'satellite'
    });
    var googleHybrid = L.gridLayer.googleMutant({
        maxZoom: 24,
        type: 'hybrid'
    });

    // Initialize Baidu map
    var baiduRoadMap = new L.TileLayer.BaiduLayer("Normal.Map");
    var baiduSatellite = new L.TileLayer.BaiduLayer("Satellite.Map");

    // Initialize Here map
    var here_appId = 'itFu46QqjFn8CY0rfLdB';
    var here_appCode = 'fUSfSpQI48RWqR4PxOu7Kg';

    var hereRoadMap = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'normal.day'
    });

    var hereRoadMapGrey = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'normal.day.grey'
    });

    var hereRoadMapNight = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'normal.night'
    });

    var hereRoadMapNightGrey = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'normal.night.grey'
    });

    var hereSatellite = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'satellite.day'
    });

    var hereHybridGrey = L.tileLayer.here({
        appId: here_appId,
        appCode: here_appCode,
        scheme: 'hybrid.grey.day'
    });


    var schemes = [
        'normal.day',
        'normal.day.grey',
        'normal.day.transit',
        'normal.night.transit',
        'normal.day.custom',
        'normal.night',
        'normal.night.grey',
        'pedestrian.day',
        'pedestrian.day.mobile',
        'pedestrian.night',
        'pedestrian.night.mobile',
        'carnav.day.grey',
        'normal.day.mobile',
        'normal.day.grey.mobile',
        'normal.day.transit.mobile',
        'normal.night.transit.mobile',
        'normal.night.mobile',
        'normal.night.grey.mobile',
        'reduced.day',
        'reduced.night',
        'terrain.day',
        'satellite.day',
        'hybrid.day',
        'hybrid.day.transit',
        'hybrid.grey.day',
        'terrain.day.mobile',
        'hybrid.day.mobile'
    ]


    // Add different map layers
    var baseMaps = {
         "DP2_HERE": dp2,
        "Google_Road": googleRoadmap,
        "Google_Satellite": googleSatellite,
        "Google_Hybrid": googleHybrid,
        "OSM_Road": osmRoadMap,
        "Baidu_Road": baiduRoadMap,
        "Baidu_Satellite": baiduSatellite,
        "Here_Road": hereRoadMap,
        "Here_Road_Grey": hereRoadMapGrey,

        "Here_Hybrid_Grey": hereHybridGrey,
        "Here_Satellite": hereSatellite
    };

    var layers = L.control.layers(baseMaps).addTo(map);

    //    layers.setPosition("topright");
    //    // Set zooming control to bottom right
    map.zoomControl.setPosition('topright');
    //    var scale = L.control.scale().addTo(map);
    //    scale.setPosition("topright");

    //=============================================================================
    // Description: Context menu related functions
    // Author: Chen Yang
    // Created: 03/01/2017
    // Last Modified: 03/01/2017
    //=============================================================================
    /**
     * Set up maker with size and style
     */
    var icons = {
        originIcon: new L.icon({
            iconUrl: 'img/compass.svg',
            iconSize: [26, 26],
        }),

        destinationIcon: L.icon({
            iconUrl: 'img/destination_4.svg',
            iconSize: [26, 26],
        }),

        maneuverIcon: L.icon({
            iconUrl: 'img/sun.svg',
            iconSize: [20, 20],
        }),

        maneuverMouseOverIcon: L.icon({
            iconUrl: 'img/dot-and-circle-black.svg',
            iconSize: [22, 22],
        }),

        edgeEndMouseOverIcon: L.icon({
            iconUrl: 'img/circle_black.svg',
            iconSize: [12, 12],
        }),

        edgeStartMouseOverIcon: L.icon({
            iconUrl: 'img/right-arrow-black.svg',
            iconSize: [16, 16],
        }),
    };

    var originMakerOption = {
        icon: icons.originIcon,
        draggable: true,
        opacity: 2,
        zIndexOffset :10,
    };

    var destinationMakerOption = {
        icon: icons.destinationIcon,
        draggable: true,
        opacity: 2,
         zIndexOffset :10,
    };

    var maneuverOption = {
        icon: icons.maneuverIcon,
        draggable: false,
        opacity: 1,
    };

    var maneuverMouseOverOption = {
        icon: icons.maneuverMouseOverIcon,
        draggable: false,
        opacity: 1,
    };

    var edgeOptions = {
        color: '#ff6bff',

        weight: 5,
        opacity: 0.6,
    };

    var edgeMouseOverOptions = {
        color: '#00F7FF',
        weight: 6,
        opacity: 1,
    };

    var waypoint = L.icon({
        iconUrl: 'img/waypoint_1.svg',
        iconSize: [32, 32],
    });

    var waypointMakerOption = {
        icon: waypoint,
        draggable: true,
        opacity: 1,
        zIndexOffset :10,
    };


    /**
     * Popup latLng of current mouse position
     * @param {<Event>} event
     */
    function showCoordinates(e) {
        alert(e.latlng);
    }

    /**
     * Convert latLng to a string value of latLng
     * @param {<LatLng>} latLng
     * @returns {string} a string value of latLng
     */
    function latLngToString(latLng) {
        var numberOfDecimal = 5;
        return ((latLng.lat).toFixed(numberOfDecimal) + ',' + (latLng.lng).toFixed(numberOfDecimal));
    }

    /**
     * Remove a maker from currently activity map
     * @param {<Maker>} maker
     */
    function removeMaker(maker) {
        if (maker != null) {
            maker.remove();
        }
    }

    /**
     * Remove makers from currently activity map
     * @param {array} makers - array of makers
     */
    function removeMakers(makers) {
        if (makers != null) {
            for (var i = 0; i < makers.length; i++) {
                var maker = makers[i];
                removeMaker(maker);
            }
        }
    }

    /**
     * Create a maker and add to a base map
     * @param {<LatLng>} latLng
     * @param {<Marker options>} options
     * @returns {<Marker>} maker
     */
    function addMaker(latLng, options) {
        var maker = new L.marker(latLng, options);
        return maker;
    }

    /**
     * Move a maker to a new position
     * @param {<Marker>} maker
     * @param param {<LatLng>} latLng, new position.
     */
    function moveMaker(maker, latLng) {
        maker.setLatLng(latLng);
    }

    /**
     * Update attribute value
     * @param {string} attribute, defined on html.
     * @param {object} value.
     */
    function updateAttributeValue(attr, value) {
        $('#' + attr).val(value);
    }

    /**
     * Set current position with a maker and add event listeners (dragend, contextmenu, dblclick)
     * bind the maker with a global variable and update corresponding html field
     *
     * dragend: update location when maker is dragged
     * contextmenu: right click to show content
     * dblclick: double click to delete current maker
     *
     * @param {<Event>} event
     */
    function setOrigin(e) {
        var latLng = e.latlng;
        var attr = 'origin-input';
        colorArrrayServerReset();
        // Create a new maker
        if (gOriginMaker === undefined || gOriginMaker === null) {
            gOriginMaker = addMaker(latLng, originMakerOption);
            gOriginMaker.addTo(map);
            // Add event listeners
            gOriginMaker.addEventListener('dragend', function (e) {
                updateAttributeValue(attr, latLngToString(e.target.getLatLng()));
                // Draw route
                submitForm();
            });

            gOriginMaker.addEventListener('contextmenu', function (e) {
                alert(latLngToString(e.target.getLatLng()));

            });

            gOriginMaker.addEventListener('dblclick', function (e) {
                removeMaker(gOriginMaker);
                gOriginMaker = null;
                updateAttributeValue(attr, '');
                // Clear route

            });
        }
         else {
            moveMaker(gOriginMaker, latLng);
             
        }

        updateAttributeValue(attr, latLngToString(latLng));

        // Draw route when set origin is clicked
        if(e.containerPoint)
            submitForm();
    
    }
    
    
    function setDestination(e) {
        var latLng = e.latlng;
        var attr = 'destination-input';
        colorArrrayServerReset();
        // Create a new maker
        if (gDestinationMaker === undefined || gDestinationMaker === null) {
            gDestinationMaker = addMaker(latLng, destinationMakerOption);
            gDestinationMaker.addTo(map);

            gDestinationMaker.addEventListener('dragend', function (e) {
                updateAttributeValue(attr, latLngToString(e.target.getLatLng()));
                // Draw route
                submitForm();
            });

            gDestinationMaker.addEventListener('contextmenu', function (e) {
                alert(latLngToString(e.target.getLatLng()));
            });

            gDestinationMaker.addEventListener('dblclick', function (e) {
                removeMaker(gDestinationMaker);
                gDestinationMaker = null;
                updateAttributeValue(attr, '');
                // Clear route
            });
        }
        else {
            moveMaker(gDestinationMaker, latLng);
        }

        updateAttributeValue(attr, latLngToString(latLng));

         // Draw route set destination is clicked
        if(e.containerPoint)
            submitForm();

    }

    function reverseOD(){
		o_tmp = $('#origin-input').val().replace(/ /g,"");
       	d_temp = $('#destination-input').val().replace(/ /g,"");
     	$('#origin-input').val(d_temp);
     	$('#destination-input').val(o_tmp);
		submitForm();
    }


    function addWaypoint(e) {
         var latLng = e.latlng;

        if (numberOfWaypoints < maxWaypoint) {
                numberOfWaypoints++;
                var div = "<div> <input class='location-input' id='waypoint-input"+numberOfWaypoints+"' type='text' placeholder='waypoint'>"+waypointButton+"</div>";
                 var attr = 'waypoint-input'+numberOfWaypoints;
                $("#waypoint").append(div);
        }

         // Create a new maker
        if (gWaypointMaker === undefined || gWaypointMaker === null) {
            gWaypointMaker = addMaker(latLng, waypointMakerOption);
            gWaypointMaker.addTo(map);
            // Add event listeners
            gWaypointMaker.addEventListener('dragend', function (e) {
                updateAttributeValue(attr, latLngToString(e.target.getLatLng()));
                // Draw route
                submitForm();
            });

            gWaypointMaker.addEventListener('contextmenu', function (e) {
                alert(latLngToString(e.target.getLatLng()));

            });

            gWaypointMaker.addEventListener('dblclick', function (e) {
                removeMaker(gWaypointMaker);
                gWaypointMaker = null;
                updateAttributeValue(attr, '');
                // Clear route
            });
        }
        else {
            moveMaker(gWaypointMaker, latLng);
        }

        updateAttributeValue(attr, latLngToString(latLng));

        // Draw route
        submitForm();

    }

    //=============================================================================
    // Description: Routing related functions
    // Author: Chen Yang
    // Created: 02/16/2017
    // Last Modified: 02/17/2017
    //=============================================================================
    /**
     * Add a polyline to currently actives map
     * @param {<latLng[]>} latlngs - array of latlngs
     * @param options
     * @returns polyline
     */
    function addPolyline(latlngs, options) {
        if (latlngs != null) {
            var polyline = new L.polyline(latlngs, options);
        }   
        return polyline;
    }

    /**
     * Remove a polyline from currently actives map
     * @param {<Polyline>} polyline
     */
    function removePolyline(polyline) {
        if (polyline != null) {
            polyline.remove();
        }
    }

    /**
     * Remove a route from current activity map
     * @param {array} route - array of polyline
     */
    function removeRoute(route) {
        if (route != null) {
            for (var i = 0; i < route.length; i++) {
                removePolyline(route);
            }
        }
    }

    /**
     * Remove routes from current activity map
     * @param {array} routes - array of route
     */
    function removeRoutes(routes) {
        if (routes != null) {
            for (var i = 0; i < routes.length; i++) {
                var route = routes[i];
                removeRoute(route);
            }
        }
    }

    

    function submitForm(){
        colorArrrayServerReset();
       
        var label = 'local';

     //   var finalUrl = "http://ec2s-ngxmy18routing-na-01.stg.mypna.com:8080/more/directions/";
       var versionSelected = "V4" ; 
        var mainUrl = "/more/directions/"+versionSelected+"/json";
        var finalUrl = "";

        originVal = $('#origin-input').val().replace(/ /g,"");

        var originSplit = originVal.split(',');
        var latlngDefaultOrigin = {};
        latlngDefaultOrigin.latlng = {};
        latlngDefaultOrigin.latlng = {'lat':parseFloat(originSplit[0]),'lng':parseFloat(originSplit[1])};
        setOrigin(latlngDefaultOrigin);
         
        
       destinationVal = $('#destination-input').val().replace(/ /g,"");

        var destSplit = destinationVal.split(',');
        var latlngDefaultDest = {};
        latlngDefaultDest.latlng = {};
        latlngDefaultDest.latlng = {'lat':parseFloat(destSplit[0]),'lng':parseFloat(destSplit[1])};
        setDestination(latlngDefaultDest);

      
       var waypointVal = [];
       for(var i=1;i<=numberOfWaypoints;i++){
              waypointVal.push($('#waypoint-input'+i).val());
        }
      
      // var versionSelected = $('#api-version-selector').val() ; 
     
        wayPtMode = false;

        updateTimeFields();

        var maxRoute = $('#max-route-number-selector').val();
        var showTrafficVal = $('#traffic-selector').val();


         $('#traffic-selector').change(function(){
           $('#traffic-selector :selected').each(function(){
                if($(this).val() == "1"){
                    $('#divUtcTime').hide(); 
                    $('#divOriginTime').hide();
					var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.clear();
                }
                if($(this).val() == "2"){
                     $('#divUtcTime').show(); 
                     $('#divOriginTime').show();
                      flagShowLiveTraffic = true;
                    flagShowHistoricalTraffic = false;
                    document.getElementById("timeUTC").disabled = true;
                    document.getElementById("timeOrigin").disabled = true; 
                    var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.setValue("traffic");
                  //  $("#avoid").val("traffic");
                }
                if($(this).val() == "3"){
                     $('#divUtcTime').show(); 
                     $('#divOriginTime').show();
                    flagShowHistoricalTraffic = true;
                    flagShowLiveTraffic = false;
                    document.getElementById("timeUTC").disabled = false;
                    document.getElementById("timeOrigin").disabled = true; 
                    var $select = $('#avoid').selectize();
					var control = $select[0].selectize;
					control.setValue("traffic");
                }
           });
        });
        
        var constPara = "&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=1&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true";

         finalUrl += "?&origin="+originVal+"&destination="+destinationVal+"&time="+timeValUtc+"&api_version="+versionSelected;

        if(waypointVal.length !=0 ){
            finalUrl += "&max_route_number="+1;
            wayPtMode = true;
        }
        else if(maxRoute != undefined && maxRoute != "")
            finalUrl += "&max_route_number="+maxRoute;

       
         waypointValGoogle =[];
        if(waypointVal.length !=0 ){
           var waypointUrl = "";
            for(var i=0;i<waypointVal.length;i++){
                waypointUrl += waypointVal[i]+"|";
                waypointValGoogle.push({'location':waypointVal[i],'stopover':false});
            }
                finalUrl += "&waypoints="+waypointUrl;
                wayPtMode = true;
                totalRequest =1; 
        }

        

        var avoidVal ="";
        if($("#avoid").val() != ""){
            $.each($("#avoid :selected"),function(){
                avoidVal = avoidVal + ($(this).val())+",";
                finalUrl += "&avoid="+avoidVal ;
            });
        }

        var modeVal ="";
        if($("#mode").val() != ""){
            $.each($("#mode :selected"),function(){
                modeVal = modeVal + ($(this).val())+",";

            });
             finalUrl += "&mode="+modeVal;
        }

         $('#mode').change(function(){
           $('#mode :selected').each(function(){
                if($(this).val() == "eco"){
                  $('#ecoCurve').show(); 
                }
                if($(this).val() != "eco"){
                  $('#ecoCurve').hide(); 
                }
                  
           });
        });


        var eco_curve_id = $("#eco_curve_id :selected").text();
        if (eco_curve_id != null && eco_curve_id.length != 0) {
            finalUrl += "&eco_curve_id=" + eco_curve_id;
        }


        finalUrl += "&show_traffic="+flagShowLiveTraffic+"&show_historical_traffic="+flagShowHistoricalTraffic ;

        if( $("#heading-input").val())
            finalUrl += "&heading="+$("#heading-input").val();

        if( $("#speed-in-mps-input").val())
            finalUrl += "&speed_in_mps="+$("#speed-in-mps-input").val();

        if( $("#dest-house-number-input").val())
            finalUrl += "&dest_house_number="+$("#dest-house-number-input").val();

        if( $("#dest-street-name-input").val())
            finalUrl += "&dest_street_name="+$("#dest-street-name-input").val();

        flagDoItOnce = true;
        countServer =0;
        multipleServer = false;
        urlArray = [];

        $('#server :selected').each(function (i, selected) {
            var currentServer = $(selected).attr('value');
            if (currentServer !== undefined && currentServer !== false && currentServer.length > 0) {

                label = $(selected).attr('label');
                if (i == 0)
                    server = $(selected).attr('label');
                else
                    server = server + "," + $(selected).attr('label');

                countServer++;

                if(countServer >1){
                    multipleServer = true;
                //    multipleServerAnalytics = false;
                    removeEdges();
                    removeMarkers();
                    removeEdgeArrow();       
                }

                finalUrl += "&server="+currentServer ;

                if (currentServer === "google") {

                     if(countServer===1){
                        removeEdges();
                        removeMarkers();
                        removeEdgeArrow();    
                    }
                    calcGoogleRoute();   //Need to ask Chen about this
                }
                else {
                    // iterate each route style
                     modeArray = [];
                    if($("#mode").val() != ""){
                        modeArray = $('#mode').val();
                    }

                    var uniqueUrl = "http://"+currentServer+mainUrl+finalUrl;

                    callTbodyActive('guidanceTbody1F',1);

                    var urlPushVal = currentServer+mainUrl+finalUrl;
                    //GAGAN:Work on multiple mode and multiple route logic
                    if(modeArray.length >1){
                        multipleMode = true ;
                        removeEdges();
                        removeMarkers();
                        removeEdgeArrow();                  
                        //Work on cleaning sidePanel and colorCode of Route numbers
                        redrawGuidanceSideTabs();
                        drawMultiModeRoutes(0, modeArray, uniqueUrl,constPara,multipleMode,wayPtMode,urlPushVal,"");
                    }
                    else{
                        multipleMode = false;
                        redrawGuidanceSideTabs();
                        drawMultiModeRoutes(0, modeArray, uniqueUrl,constPara,multipleMode,wayPtMode,urlPushVal,"");
                    }
                         
                }
            }
        });

     //   pageUrl = window.location.origin + window.location.pathname + finalUrl;
     //   console.log("PAGEURL-->"+pageUrl);
     //   window.history.pushState("newurl2", "Title2", pageUrl);

        //For testing purpose
        var testUrl = "http://ec2s-ngxmy18routing-na-01.stg.mypna.com:8080/more/directions/V4/json?&origin=37.398009,-121.977486&destination=37.38285,-122.00924&time=2017-5-15T18:12Z&avoid=hov,traffic,unpaved&max_route_number=3&api_version=V4&server=undefined,na_den18_stage";
    }

    function readSingleFile(e) {
      var file = e.target.files[0];
      if (!file) {
        return;
      }
      var reader = new FileReader();
      reader.onload = function(e) {
            var contents = e.target.result;
            console.log("Profile contents-"+contents);
            var formInputArray = [];
            formInputArray = contents.split("--");
        
            //set values

            $('#origin-input').val(formInputArray[0]);
            $('#destination-input').val(formInputArray[1]);

      };
      reader.readAsText(file);

    }

    document.getElementById('loadProfile').addEventListener('change', readSingleFile, false);

    function saveProfile(){
        var profileArray = [];

        var originProf = $('#origin-input').val().replace(/ /g,"");
        profileArray.push(originProf+"--");
        var destProf = $('#destination-input').val().replace(/ /g,"");
        profileArray.push(destProf+"--");

      
        //var blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
        var blob = new Blob( profileArray, {type: "text/plain;charset=utf-8"});
        saveAs(blob, "profile.txt");
    }

    function calcGoogleRoute() {
        // https://developers.google.com/maps/documentation/javascript/directions#DrivingOptions
        // If the request does not include drivingOptions), the returned route is a generally good route without taking traffic conditions
        var request = {
            origin: $('#origin-input').val(),
            destination: $('#destination-input').val(),
            waypoints: waypointValGoogle,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(Date.now()),
                trafficModel: 'bestguess'
            },
            unitSystem: google.maps.UnitSystem.IMPERIAL
        };

		var directionsService = new google.maps.DirectionsService();
		var directionsDisplay = new google.maps.DirectionsRenderer();

        directionsService.route(request, function (response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
               
                map.removeLayer(polylineGoogle);

                var latlngArrayGoogle =[];
                 latlngArrayGoogle = decodePolyline(response.routes[0].overview_polyline);
                
                 polylineGoogle = new L.Polyline(latlngArrayGoogle, {
                  color: '#00bfff',
                  weight: 8,
                  opacity: 0.5
                }).addTo(map);

                 document.getElementById('google_summary').innerHTML = "";
                for(var k=0;k<response.routes[0].legs.length;k++){
                    distFromGoogleServer = meterToMile(response.routes[0].legs[k].distance.value);
                    delay_time_google = Math.round((response.routes[0].legs[k].duration_in_traffic.value - response.routes[0].legs[k].duration.value) / 60);
                     document.getElementById('google_summary').innerHTML = distFromGoogleServer+" mi;"+response.routes[0].legs[k].duration_in_traffic.text+" in total;"+delay_time_google+"m delay";
                }

               
                if(document.getElementById('pairSummaryGoogle') != undefined){
                      document.getElementById('pairSummaryGoogle').innerHTML = "";
                      document.getElementById('pairSummaryGoogle').innerHTML += document.getElementById('google_summary').innerHTML ;
                      }
                }
        });
    }

    function redrawGuidanceSideTabs(){

            guidanceArray = [];
            routeNoArray = [];
            telenavRouteSummary = []; //clean teleanv summary
            colorCodeArray= [];
            $("#sidebar-ul li:not(:first)").remove();     
            map.removeLayer(polylineGoogle);  //clear google route  
            $("#google_summary").val("");  //clear google summary from left panel
    }


    function drawMultiModeRoutes(i, modeArray, finalUrl,constPara,multipleMode,wayPtMode,urlPushVal,col) {
        if (i >= modeArray.length) return;
        if (i > 0) {
            // becuase routing server can only recognize the first mode, so we need remove previouse modes
            finalUrl = finalUrl.replace(RegExp(modeArray[i - 1] + ",", "g"), "");
            urlPushVal = urlPushVal.replace(RegExp(modeArray[i - 1] + ",", "g"), "");
        }
        var url = finalUrl + constPara;
        modeId = modeArray[i];  //fastest,eco
        console.log("modeID-"+modeId);
       

        // In order to make sure mode route is rendered in order, use callback function
        ajaxRouteRender(multipleMode,modeId,wayPtMode,url,urlPushVal,col, function () {
            console.log("Request-"+i + 1+"URL->"+urlPushVal);
            totalRequest++;
            drawMultiModeRoutes(i + 1, modeArray, finalUrl, constPara,multipleMode,wayPtMode,urlPushVal,col);
        });
    }

    /**
     * Check whether a pair of origin and destination exists,
     * if yes, draw a route. If no, do nothing
     * @returns {boolean} boolean
     */
    function checkOriginDestination() {
        var origin = $('#origin_input').val();
        var destination = $('#destination_input').val();

        if (origin != null && destination != null && isNaN(origin) && isNaN(destination)) {
            return true;
        }

        return false;
    }

    function formatLatLng(decodedPolyline) {
        var latlngArray = [];
        if (decodedPolyline == null || decodedPolyline.length == 0) return latlngArray;

        for (var i = 0; i < decodedPolyline.length; i++) {
            var latlng = new L.latLng(decodedPolyline[i].lat(), decodedPolyline[i].lng());
            latlngArray.push(latlng);
        }

        return latlngArray;
    }

    function decodePolyline(encodedPolyline) {
        var latlngArray = [];

        if (encodedPolyline == null || encodedPolyline.length == 0) return latlngArray;
        var decodedPolyline = google.maps.geometry.encoding.decodePath(encodedPolyline);
        latlngArray = formatLatLng(decodedPolyline);

        return latlngArray;
    }

    function addListenerToObjArray(objArray, events) {
        if (objArray == null) return;

        for (var i = 0; i < objArray.length; i++) {
            var obj = objArray[i];
            obj.on(events);
        }

    }

    function addObjArrayToMap(objArray, map) {
        if (objArray == null || objArray.length == 0) return;
        for (var i = 0; i < objArray.length; i++) {
            var obj = objArray[i];
            obj.addTo(map);
        }
    }

    function removeObjArrayFromMap(objArray) {
        if (objArray == null || objArray.length == 0) return;
        for (var i = 0; i < objArray.length; i++) {
            var obj = objArray[i];
            obj.remove();
        }
    }

    function buildTnJSONEdge(edge, options, isTrafficOn) {

        if (edge == null || edge.encoded_polyline == null) return;

        var latlngArray = decodePolyline(edge.encoded_polyline);
        if (latlngArray == null || latlngArray.length == 0) return;

        options.info = edge;
        options.info.startPoint = latlngArray[0];
        options.info.endPoint = latlngArray[latlngArray.length - 1];

        var polyline = addPolyline(latlngArray, options);

        // !important. Otherwise global options will add one more attribute which info.
        delete options.info;

        return polyline;
    }

    function buildTnJSONMaker(edge, info, options) {

        if (edge == null || edge.encoded_polyline == null) return;

        var latlngArray = decodePolyline(edge.encoded_polyline);
        if (latlngArray == null || latlngArray.length == 0) return;

        var latlng = latlngArray[latlngArray.length - 1];
        options.info = info;
        var maker = addMaker(latlng, options);

        // !important. Otherwise global options will add one more attribute which info.
        delete options.info;

        return maker;
    }

   
    function parseTnJSON(data,modeId,multipleMode,wayPtMode) {
        routeArray = []; 
        var value ;  
      
        if (data.status.message != 'MAP_OK' && data.route == null) return routeInfo;

        for (var i in data.route){
            console.log("ROUTE--"+i);
            var route = data.route[i];
             
            var routeInfo = {};
            var edges = [];
            var makers = [];
            var turnId =0;

            routeInfo.summary = route.route_info;
            routeInfo.start = route.start_point_status;
            routeInfo.end = route.end_point_status;

            // Add actual start point
           
            var latlngArray = decodePolyline(routeInfo.start.edge_clipped_points);


            if (latlngArray != null && latlngArray.length != 0) {
                routeInfo.startPoint = latlngArray[0];
            }

            // Add actual end point
            latlngArray = decodePolyline(routeInfo.end.edge_clipped_points);
            if (latlngArray != null && latlngArray.length != 0) {
                routeInfo.endPoint = latlngArray[latlngArray.length - 1];
            }

            for (var j = 0; j < route.segment.length; j++) {
                var segment = route.segment[j];

               // var markerIconVal = getMarkerIcon(segment);

                for (var k = 0; k < segment.edge.length; k++) {
                    var edge = segment.edge[k];

                    var polyline = buildTnJSONEdge(edge, edgeOptions,true);
                    if (polyline != null) edges.push(polyline);

                    if (k == (segment.edge.length - 1)) {
                        delete segment.edge;
                       // maneuverOptionTest.icon = iconName;
                       var maneuverOptionSprite = {
                            icon : L.divIcon({
                                html: getMarkerIcon(segment),
                                iconAnchor:[12,14],
                                iconSize: markerSize,
                            }),
                            draggable: false,
                            opacity: 1,
                        };
                        var maker = buildTnJSONMaker(edge, segment, maneuverOptionSprite);
                        if (maker != null) makers.push(maker);
                        // !important. Since edge has been removed, can not go to the last loop.
                        break;
                    }
                }
                
                

                if(flagMeter === false){
                   var distanceMiles = segment.length_in_meter * 0.000621371 ;  //convert meters into miles
                    var distanceVal = distanceMiles.toFixed(2)+" miles";
                }
                else
                    var distanceVal = segment.length_in_meter+" meters";
            
               var idVal = segment.turn_type+"-"+turnId+"-"+distanceVal ;
                var idMode;
                if(modeId==='fastest')
                    idMode = 'F';
                if(modeId==='shortest')
                    idMode = 'S';
                if(modeId==='eco')
                    idMode = 'E';
                if(modeId==='pedestrain')
                    idMode = 'P';

                var routeNoVal = parseInt(i)+1 ;
                 routeNoVal = routeNoVal+idMode;  

               
                 if(turnId == '1'  && i == 0 && flagDoItOnce ){

                   value = routeNoVal;
                   console.log("VALUE SET-"+value);
                   flagDoItOnce = false;

                }


                console.log("routeNoVal - "+routeNoVal); 
               

                if(wayPtMode){
                        var wayRouteNo = totalRequest + idMode;
                        console.log("WAY ROUTE -"+totalRequest);

                        guidanceArray.push({'routeNo': wayRouteNo,'modeId':modeId,'wayId':wayPtMode,'placeId': makers[turnId]._latlng.lat + makers[turnId]._latlng.lng ,'turnId': idVal ,'turn':segment.turn_type,'icon':getMarkerIcon(segment),'distance': distanceVal});
                }
                


               else{
                guidanceArray.push({'routeNo': routeNoVal,'modeId':modeId,'wayId':wayPtMode,'placeId': makers[turnId]._latlng.lat + makers[turnId]._latlng.lng ,'turnId': idVal ,'turn':segment.turn_type,'icon':getMarkerIcon(segment),'distance': distanceVal});
                }

                turnId++;   
                 makersData.push(makers);

            }

            var delayTelenav = parseInt(data.route[i].route_info.traffic_delay_in_second/60) ;
            var distanceTelenav = meterToMile(data.route[i].route_info.travel_dist_in_meter);
            var durationTelenav = parseInt(data.route[i].route_info.travel_time_in_second/60);
            telenavRouteSummary.push({'routeVal':i,'summary':distanceTelenav+" mi;"+durationTelenav+" mins in total;"+delayTelenav+"m delay"}); 

            console.log("Guidance Array length - "+guidanceArray.length); 
            //logic where blank guidance table comes up if you change query to show less routes.
             callFirstRouteAvailable(value);
            
            if (edges.length != 0 && makers.length != 0) {
                routeInfo.edges = edges;
                routeInfo.makers = makers;
                routeArray.push(routeInfo);
            }
        }
        
        return routeArray;
    }

    function getMarkerIcon(segment){

        //Storage variable which will have turn type info to create guidance
                var iconName ;
                switch(segment.turn_type){
                    case "TURN_RIGHT":
                        iconName = '<i class="spriteTurn L2L_TURN_RIGHT_SCOUT" />';
                        break;

                    case "TURN_LEFT":
                        iconName = '<i class="spriteTurn  L2L_TURN_LEFT_SCOUT" />';
                        break;

                    case "TURN_HARD_RIGHT":
                        iconName = '<i class="spriteTurn L2L_TURN_HARD_RIGHT_SCOUT" />';
                        break;

                    case "TURN_HARD_LEFT":
                        iconName = '<i class="spriteTurn  L2L_TURN_HARD_LEFT_SCOUT" />';
                        break;


                    case "LEFT_U_TURN":
                        iconName = '<i class="spriteTurn  L2L_U_TURN_SCOUT" />';
                        break; 

                    case "TURN_SLIGHT_LEFT":
                        iconName = '<i class="spriteTurn  L2L_TURN_SLIGHT_LEFT_SCOUT" />';
                        break;

                    case "TURN_SLIGHT_RIGHT":
                        iconName = '<i class="spriteTurn  L2L_TURN_SLIGHT_RIGHT_SCOUT" />';
                        break;  
                    
                    case "LOCATION_LEFT":
                        iconName = '<i class="spriteTurn  DESTINATION_LEFT_SCOUT" />';
                        break;  

                    case "LOCATION_RIGHT":
                        iconName = '<i class="spriteTurn  DESTINATION_RIGHT_SCOUT" />';
                        break;  

                    case "LOCATION_AHEAD":
                        iconName = '<i class="spriteTurn  DESTINATION_AHEAD_SCOUT" />';
                        break;  

                     case "STAY_LEFT":
                        iconName = '<i class="spriteTurn  STAY_LEFT_SCOUT" />';
                        break;

                    case "STAY_RIGHT":
                        iconName = '<i class="spriteTurn  STAY_RIGHT_SCOUT" />';
                        break;

                    case "CONTINUE":
                        iconName = '<i class="spriteTurn  L2L_CONTINUE_SCOUT" />';
                        break;    

                     case "ENTER_AHEAD":
                        iconName = '<i class="spriteTurn  ROUNDABOUT_ENTER_SCOUT" />';
                        break;  

                    case "EXIT_LEFT":
                        iconName = '<i class="spriteTurn  H2R_EXIT_LEFT_SCOUT" />';
                        break;  

                    case "EXIT_RIGHT":
                        iconName = '<i class="spriteTurn  H2R_EXIT_RIGHT_SCOUT" />';
                        break;  

                    default:
                        iconName = 'X';
                }

                return iconName;

    }


    function createGuidanceTable(guidanceArray,multipleMode){  
        clearGuidanceTbody();
        //clear sidePanel as well

        var tbody = $('#guidance-route');
        var tSidePanel = $('#sidebar-ul');
        var tSidePanelLi = $('#sidebar-ul li') ;
        var props = ["Head"];
        var idMaker = {};

        var i =0;
        

        $.each(guidanceArray, function(row,turn) {   

        var tr = $("<tr class='item' id="+turn.routeNo+" modeId ="+turn.modeId+" placeId="+turn.placeId+" wayPtId="+turn.wayId+" >");
            $.each(props, function(row, prop) {
                $('<td>').html(turn.icon).appendTo(tr); 
                $('<td>').html(turn.turn).appendTo(tr); 
                $('<td>').html(turn.distance).appendTo(tr);   
            }); 
           
        
                if(!routeNoArray.includes(turn.routeNo)){   
                    routeNoArray.push(turn.routeNo);  
                    var addItem = true;
                    
                    if(addItem)
                        tSidePanel.append("<li class='active' style='color:"+colorCodeArray[i]+"' id=S"+turn.routeNo+"><a href='#"+turn.routeNo+"' id='"+turn.routeNo+"' role='tab' onclick=callTbodyActive(guidancetbody"+turn.routeNo+",2)>"+turn.routeNo+"</a></li>");
                    i++;
                                     
                }
                
                $('#guidancetbody'+turn.routeNo).append(tr);
            
        });
    

        addRowHandlers();
        document.getElementById("sidebar-right").className = "sidebar rightCollapse sidebar-right leaflet-touch";
        document.getElementById("guidance").className = "sidebar-pane active" ;
    }

    var lastClicked = "S1F" ;
    function callTbodyActive(val,n){
        for(var i=1;i<4;i++){
             $('#guidancetbody'+i+'F').hide();
             $('#guidancetbody'+i+'S').hide();
             $('#guidancetbody'+i+'E').hide();
             $('#guidancetbody'+i+'P').hide();
        }
       $(val).show();

       if(n !== 1){
            document.getElementById(lastClicked).style.backgroundColor = "black";
            document.getElementById("S"+val.firstChild.id).style.backgroundColor = "grey";
            lastClicked = "S"+val.firstChild.id ;
        }
    }

    function callFirstRouteAvailable(val){
       $('#guidancetbody'+val).show();       
    }

    function clearGuidanceTbody(){
       for(var i=1;i<4;i++){
             $('#guidancetbody'+i+'F').empty();
             $('#guidancetbody'+i+'S').empty();
             $('#guidancetbody'+i+'E').empty();
             $('#guidancetbody'+i+'P').empty();
        }
    
    }
    var jsonTurnData = [];

    var routeManeuverMakerEvents = {
        'mouseover': function () {
         //   this.setIcon(icons.maneuverMouseOverIcon);
          //  mapIcons.push(icons.maneuverMouseOverIcon);

            clearGuidanceBackground();
            matchMapWithGuidanceRow(this.options.info);
            var aa = "Length(m) :"+this.options.info.length_in_meter;
           // this.bindPopup(aa).openPopup();
        },
        'mouseout': function () {
        /*      if (this != maneuverMaker) {
                this.setIcon(icons.maneuverIcon);
          //      mapIcons.push(icons.maneuverIcon);
            }
            */
             clearGuidanceBackground();
        },
        'click': function () {
         /*   if (maneuverMaker != null) {
                maneuverMaker.setIcon(icons.maneuverIcon);
          //      mapIcons.push(icons.maneuverIcon);
            }
            */
            maneuverMaker = this;
       //     this.setIcon(icons.maneuverMouseOverIcon);
           // mapIcons.push(icons.maneuverMouseOverIcon);
           centerLeafletMapOnMarker(map,this._latlng);
           jsonTurnData = JSON.stringify(this.options.info) ;

           createTreeView(jsonTurnData);
   
        }

    };


    function centerLeafletMapOnMarker(map, marker) {
        var latLngs = [marker];
        var markerBounds = L.latLngBounds(latLngs);
        map.fitBounds(markerBounds);
    }
      
    function createTreeView(jsonTurnData){
       //     $("#jsonTurn").jJsonViewer(jsonTurnData);

       activeTab('params');
        $('#browser').jsonbrowser(jsonTurnData);


        $('#collapse-all').on('click', function(e) {
            e.preventDefault();
            $.jsonbrowser.collapseAll('#browser');
        });

        $('#expand-all').on('click', function(e) {
            e.preventDefault();
            $.jsonbrowser.expandAll('#browser');
        });

        $('#search').on('keyup', function(e) {
            e.preventDefault();
            $.jsonbrowser.search('#browser', $(this).val());
            });

        $('#search').focus().trigger('keyUp');
    

    }

    function activeTab(tab){
        $('.nav-tabs a[href="#' + tab + '"]').tab('show');
    };

    //Function to highlight guidance when hover over turn markers on map
    //ID match criteria : (distance in miles) miles-turn_type eg: 1.20 miles-TURN_LEFT
    function matchMapWithGuidanceRow(infoObj){

        var table = document.getElementById("guidance-route");
        var rows = table.getElementsByTagName("tr");
       
        for (i = 0; i < rows.length; i++) {
                var match = infoObj.length_in_meter ;
                var matchVal = meterToMile(match);
                var idMatch = matchVal +" miles-"+ infoObj.turn_type;
                var currentRow = table.rows[i];
               
                var cell = currentRow.getElementsByTagName("td")[2];
                var id = cell.innerHTML+"-"+ currentRow.getElementsByTagName("td")[1].innerHTML;
                //console.log("MATCH-"+id+"--"+idMatch);

                if(id===idMatch){
                    currentRow.style.background = "grey";
                    break;
            }

                  }
    }

    //Cleaning Guidance background before loading new guidance for new route
    function clearGuidanceBackground(){
        var table = document.getElementById("guidance-route");
        var rows = table.getElementsByTagName("tr");
        

        for (i = 0; i < rows.length; i++) {
                     var currentRow = table.rows[i];
                     currentRow.style.background = "white";
            }
    }

   //Adding row handlers to Guidance table rows which are mapped to respective icons on map

   function addRowHandlers() {
    var table = document.getElementById("guidance-route");
    var rows = table.getElementsByTagName("tr");
    var oldMarker={};
    //Mouseover on Guidance row higlights marker on map
    for (i = 0; i < rows.length; i++) {
        var currentRow = table.rows[i];
            var createOnMouseOverHandler = 
            function(row) 
            {
                return function() { 
                    var tableRowId= row.getAttribute("placeId");        
                    Object.keys(map._targets).forEach(function(key){
                        if(map._targets[key]._latlng != undefined){
                            var markerId = map._targets[key]._latlng.lat + map._targets[key]._latlng.lng;   
                            if(markerId == tableRowId)  {
                                 oldMarker = {
                                    icon : L.divIcon({
                                        html: map._targets[key].options.icon.options.html,
                                        iconAnchor:[12,14],
                                        iconSize: markerSize,
                                    })
                                 };
                                 map._targets[key].setIcon(icons.maneuverMouseOverIcon); 
                                //map._targets[key].setIcon(oldMarker.icon);
                            }
                        }
                    });
                };
            };
            currentRow.onmouseover = createOnMouseOverHandler(currentRow);   //onmouseover 

    }

    //Mouseout remove the highlight from marker on map

    for (i = 0; i < rows.length; i++) {
        var currentRow = table.rows[i];
            var createOnMouseOutHandler = 
            function(row) 
            {
                return function() { 
                    var tableRowId= row.getAttribute("placeId");        
                    Object.keys(map._targets).forEach(function(key){
                        if(map._targets[key]._latlng != undefined){
                            var markerId = map._targets[key]._latlng.lat + map._targets[key]._latlng.lng;  

                            if(markerId == tableRowId){
                               /*  var oldMarker = {
                                    icon : L.divIcon({
                                        html: map._targets[key].options.icon.options.html,
                                        iconAnchor:[12,14],
                                        iconSize: markerSize,
                                    })
                                 };*/
                            map._targets[key].setIcon(oldMarker.icon);        
                             //map._targets[key].setIcon(icons.maneuverMouseOverIcon);           
                            }
                        }
                    });
                };
            };
            currentRow.onmouseout = createOnMouseOutHandler(currentRow);   //onmouseover 

    }

    //onclick event of guidance table row
    for (i = 0; i < rows.length; i++) {
        var currentRow = table.rows[i];
        var createClickHandler = 
        function(row) 
        {
             return function() { 
                    var tableRowId= row.getAttribute("placeId");        
                    Object.keys(map._targets).forEach(function(key){
                        if(map._targets[key]._latlng != undefined){
                            var markerId = map._targets[key]._latlng.lat + map._targets[key]._latlng.lng;   
                            if(markerId == tableRowId) {    
                                map._targets[key].setIcon(icons.maneuverMouseOverIcon); 
                                 centerLeafletMapOnMarker(map,map._targets[key]._latlng);
                                createTreeView(map._targets[key].options.info);       
                            }                                    
                        }
                    });
                };
            };
               currentRow.onclick = createClickHandler(currentRow); //onmouseover 

           }
       }

    //Convers distance from meter to mile
    function meterToMile(val){

        var distanceR;
       // flagMeter = true;
        distanceR = val * 0.000621371 ;  //convert meters into miles
        distanceR = distanceR.toFixed(2);
        return distanceR;

    }

    function changeDistanceUnit(){
        flagMeter = true;
        submitForm();
    }


    var edgeEndOptions = {
        icon: icons.edgeEndMouseOverIcon,
        draggable: false,
        opacity: 1,
    };

    function calEdgeArrowPolygon(arrowStartPoint, arrowEndPoint) {
        var lat1 = arrowStartPoint.lat;
        var lng1 = arrowStartPoint.lng;
        var lat2 = arrowEndPoint.lat;
        var lng2 = arrowEndPoint.lng;

        var theta = Math.atan2(lat2 - lat1, lng2 - lng1);

        return theta * 180 / Math.PI;
    }

    function calEdgeArrowPolygon_test(arrowStartPoint, arrowEndPoint) {

        var lat1 = arrowStartPoint.lat;
        var lng1 = arrowStartPoint.lng;
        var lat2 = arrowEndPoint.lat;
        var lng2 = arrowEndPoint.lng;

        var theta = Math.atan2(lat2 - lat1, lng2 - lng1);

        return theta * 180 / Math.PI;
    }

    function showEdgeDirection(edge) {
        var edgeID = edge.map_edge_id[0];
        var edgeIDArray = edgeID.split('|');
        var latlngArray = decodePolyline(edge.encoded_polyline);
        var len = latlngArray.length;

        var arrowStartPoint;
        var arrowEndPoint;
        var endPoint;

        var edgeArrowMaker, edgeEndMaker;

        if (edgeIDArray[0].includes('-')) {
            arrowStartPoint = latlngArray[1];
            arrowEndPoint = latlngArray[0];
            endPoint = latlngArray[len-1];
        }
        else {
            arrowStartPoint = latlngArray[len-2];
            arrowEndPoint = latlngArray[len-1];
            endPoint = latlngArray[0];
        }

        if (arrowStartPoint != null && arrowEndPoint != null && endPoint != null) {
            var angle = 360 - calEdgeArrowPolygon(arrowStartPoint, arrowEndPoint);
            if (angle > 270 && angle < 360) angle = angle - 4;
            else angle = angle + 5;
            var test = calEdgeArrowPolygon_test(arrowStartPoint, arrowEndPoint);

            console.log("Angle test:"+angle, test);

            edgeArrowMaker = new L.marker(arrowEndPoint, {
                rotationAngle: angle,
                rotationOrigin: 'center center',
                icon: icons.edgeStartMouseOverIcon,
                draggable: false,
                opacity: 1,
            });

            edgeEndMaker = addMaker(endPoint, edgeEndOptions);
        }

        return [edgeArrowMaker, edgeEndMaker];
    }

    function setOriginDate(originSetDate){
     $('#timeOrigin').val(originSetDate);
    }


    function setUtcDate(utcSetDate){
     $('#timeUTC').val(utcSetDate);
    }

    function callTimeZoneDbAPI(timeZoneUrl,callback){
        $.ajax({
            type:"GET",
            url: timeZoneUrl,
            dataType : "json",
            async:false,
            success: function(data){
               console.log("Local Time of Origin ,Zone & GMT-"+data.formatted+"-"+data.zoneName+"-"+data.gmtOffset);
               originLocalDateTime = data.formatted ;
               timeZoneVal = data.zoneName ;
               gmtOffsetVal = data.gmtOffset/3600;
            },
            error: function (e) {
                alert("TimeZoneDB is down:" + url);
            },
            complete:callback
        });
    }

    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    var clickSelectedEdge = {};
    var mouseSelectedEdge = {};

    var routeEdgeEvents = {
        'mouseover': function () {
            // Save current state: style schema and direction markers
            mouseSelectedEdge = {};
            mouseSelectedEdge.options = {};
            mouseSelectedEdge.options.color = this.options.color;
            mouseSelectedEdge.options.weight = this.options.weight;
            mouseSelectedEdge.options.opacity = this.options.opacity;

            // Set to highlight style
            this.setStyle(edgeMouseOverOptions);

            //Add tooltip to marker
          //  this.bindPopup('<strong>Science Hall</strong><br>Where the GISC was born.').openPopup();
        },
        'mouseout': function () {
            // If current edge has been clicked, then don't change style when mouse out,
            // otherwise change back to original style
            if (this != clickSelectedEdge.edge) {
                this.setStyle(mouseSelectedEdge.options);
            }
        },
        'click': function () {
            // Clear previous selected edge.
            if (this != clickSelectedEdge.edge) {

                if (clickSelectedEdge != null && !isEmpty(clickSelectedEdge)) {
                    clickSelectedEdge.edge.setStyle(clickSelectedEdge.options);
                    if (clickSelectedEdge.edgeArrow != null) clickSelectedEdge.edgeArrow.remove();
                    if (clickSelectedEdge.edgeEnd != null) clickSelectedEdge.edgeEnd.remove();
                    clickSelectedEdge = {};
                }

                // Save current style which has been set by mouse over even.
                // since mouse over event happens first, don't need to set style again.
                clickSelectedEdge.edge = this;
                clickSelectedEdge.options = mouseSelectedEdge.options;

                // Add directions
                var tmp = showEdgeDirection(this.options.info);
                clickSelectedEdge.edgeArrow = tmp[0];
                clickSelectedEdge.edgeEnd = tmp[1];

                if (clickSelectedEdge.edgeArrow != null){
                  //  clickSelectedEdge.edgeArrow.addTo(map);

                    map.addLayer(clickSelectedEdge.edgeArrow);
                    mapEdgeArrow.push(clickSelectedEdge.edgeArrow);
                }
                if (clickSelectedEdge.edgeEnd != null){

                    //clickSelectedEdge.edgeEnd.addTo(map);
                    map.addLayer(clickSelectedEdge.edgeEnd);
                    mapEdgeArrow.push(clickSelectedEdge.edgeEnd);
                } 
            }

            map.fitBounds(this.getBounds().pad(2));

            var jsonTurnData = JSON.stringify(this.options.info) ;
            createTreeView(jsonTurnData);

           

        }
    };


    function removeEdges(){


        for(var i = 0; i < this.mapEdges.length; i++){
            this.map.removeLayer(this.mapEdges[i]);
        }
    }

    function removeMarkers(){

        for(var i = 0; i < this.mapMarkers.length; i++){
            this.map.removeLayer(this.mapMarkers[i]);
        }
    }


    function removeEdgeArrow(){
        for(var i = 0; i < mapEdgeArrow.length; i++){
            this.map.removeLayer(mapEdgeArrow[i]);
        }
    }


    function SetPolyTrafficColor(edge) {
    //   if ($('#traffic-selector').val() == 2) {
            var trafficSpeed;
            var edgeObject = edge.options.info;
            if ($('#traffic-selector').val() == 3)
                trafficSpeed = edgeObject.historical_speed_in_mps;
            else 
                 trafficSpeed = edgeObject.traffic_travel_speed_in_mps;
            var trafficColor = getTrafficColor(edgeObject, trafficSpeed);
        
        return trafficColor;
      //  }
    }

    function getTrafficColor(edgeObject, trafficSpeed) {
        //if free_flow_speed >=35MPH, red = (relative speed < 31.25%), yellow = (31.25% <= relative speed < 62.5% ), green = (relative speed >= 62.5%)
        //if free_flow_speed < 35MPH, red = (relative speed < 25%), yellow = (25% <= relative speed < 50% ), green = (relative speed >= 50%)
        if ((edgeObject.traffic_id === null || edgeObject.traffic_id == undefined) && (trafficSpeed === null || trafficSpeed == undefined))
            return "grey";
        else if (trafficSpeed === null || trafficSpeed == undefined)
            return "black";
        else {
            var ratio = trafficSpeed / edgeObject.travel_speed_in_mps;
            if (edgeObject.travel_speed_in_mps * 3.6 / 1.6 > 35) {
                if (ratio <= 0.3125)
                    return "red";
                else if (ratio <= 0.625)
                    return "yellow";
                else
                    return "green";
            }
            else {
                if (ratio <= 0.25)
                    return "red";
                else if (ratio <= 0.5)
                    return "yellow";
                else
                    return "green";
            }
        }
    }


    function drawRoute(data, name, colorArray, multipleMode,modeId,wayPtMode,urlPushVal,col) {
         var setCol;
         var colorVal ;
        // console.log("DATA:-"+data);

        //clean map if something is already drawn on map
        //But don't clean if its multi mode request since we need to show all the routes
        //if multipleMode is false then clean the map before drawing new request
        if( (mapMarkers.length != 0 || mapEdges.length != 0 || mapEdgeArrow.length !=0 ) && !multipleMode && countServer <2   ) {
            removeEdges();
            removeMarkers();
            removeEdgeArrow();           
        }
		
        routeArray = parseTnJSON(data,modeId,multipleMode,wayPtMode);

        if (routeArray == null || routeArray.length == 0) return;

        gCurrentBounds = null;

      
        for (var i = 0; i < routeArray.length; i++) {
            routeInfo = routeArray[i];

            addListenerToObjArray(routeInfo.edges, routeEdgeEvents);
            addListenerToObjArray(routeInfo.makers, routeManeuverMakerEvents);


            //remove route
            edgeGroup = new L.featureGroup(routeInfo.edges);
            makerGroup = new L.featureGroup(routeInfo.makers);
            
            if(col != "")
                colorVal = col ;
            else
               colorVal = colorArray[i];

            //Sets the style of all the edges in route
            edgeGroup.setStyle({
                color: colorVal   //better color picking logic   
            });

            colorCodeArray.push(colorVal);

            if($('#traffic-selector').val() === '2')
                bShowTraffic = true;
            if($('#traffic-selector').val() === '1')
                bShowTraffic = false;   

            if (bShowTraffic) {
                for(var j=0 ;j<routeInfo.edges.length ; j++){
                      //set traffic color ask Yong 
                    setCol = SetPolyTrafficColor(routeInfo.edges[j]);
                    console.log("Traffic color:"+setCol);
                        routeInfo.edges[j].setStyle({
                            color:setCol
                        });

                    if(setColArray.indexOf(setCol) === -1)
                        setColArray.push(setCol);
               
                }

                 edgeGroup = new L.featureGroup(routeInfo.edges);
               //  updateLegend(setColArray);
            }   

            map.addLayer(edgeGroup);
            map.addLayer(makerGroup);

            urlArray.push(urlPushVal);
            //pushing edges and markers in global array so they can be removed/cleaned later
            mapEdges.push(edgeGroup);
            mapMarkers.push(makerGroup);

            if (gCurrentBounds == null) {
                gCurrentBounds = edgeGroup.getBounds();
            }
            else {
                gCurrentBounds.extend(edgeGroup.getBounds());
            }
        }

        map.fitBounds(gCurrentBounds.pad(0.08));

        //Need to add accordion in Guidance for Route A,B and C
        createGuidanceTable(guidanceArray,multipleMode);
       

        //Writing Telenav route summary
        document.getElementById('guidancetbodySummary').innerHTML ="";
    
        for(var i= 0;i<telenavRouteSummary.length;i++) {
			var parser = document.createElement('a');
			parser.href = "http://" + urlArray[i];
			hostname = parser.hostname;
         document.getElementById('guidancetbodySummary').innerHTML += hostname + "<br> <a target='_blank' href=http://"+urlArray[i]+"><b style='color:"+colorCodeArray[i]+";'>"+ telenavRouteSummary[i].summary+"</b></a><br>"; 
		}
        if(document.getElementById('pairSummary')!= undefined )
        {
            document.getElementById('pairSummary').innerHTML = "";
            document.getElementById('pairSummary').innerHTML += document.getElementById('guidancetbodySummary').innerHTML ;
        }
    }

    function getColor(){
         //keep tracks of old color
         var colorV ;
            for(var k =0;k<colorArrayServers.length;k++){
                    if(colorArrayServers[k].checked != true){
                        colorV =colorArrayServers[k].color ;  //better color picking logic 
                        colorArrayServers[k].checked = true;
                        return colorV;
                    }   
                }            
    }
    /**
     * Draw a single route, add polyline reference to global array
     * @param {<LatLng[]>} latLngArray
     * @param {<Polyline options>} polylineOption
     */
    function ajaxRouteRender(multipleMode,modeId,wayPtMode,request,urlPushVal,col,callback) {
        $.ajax({
            type: 'POST',
            url: request,
            dataType: "json",
            success: function (data) {
                console.log("ROUTE-  DATA-"+data.route);
                drawRoute(data,name,colorArray,multipleMode,modeId,wayPtMode,urlPushVal,col);  
            },
            error: function () {
                alert("server is down:" + url);
            },
            complete: callback    
        });
    } 

    var sidebarLeft = L.control.sidebar('sidebar-left',{'position':'left'}).addTo(map);
    var sidebarRight = L.control.sidebar('sidebar-right',{'position' : 'right'}).addTo(map);
