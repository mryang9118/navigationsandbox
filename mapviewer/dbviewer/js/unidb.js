$( function() {
    $( "#tags" ).autocomplete({
      source: availableTags
    });
} );

function viewDB(dbhost,dbname,region){
	$('#dbname').val(dbname)
	$('#dbhost').val(dbhost)
	$('#region').val(region)
}

var markerArr = []
var lineArr = []
function removeMarkers(){
	for ( var i = 0; i < markerArr.length; i++ ) {
		map.removeLayer(markerArr[i])
	}
	for ( var i = 0; i < lineArr.length; i++ ) {
		map.removeLayer(lineArr[i])
	}
}

function showWayOnMap(data){
	regex=/Start: (\-?\d+\.\d{6},\s*\-?\d+\.\d{6})\sEnd: (\-?\d+\.\d{6},\s*\-?\d+\.\d{6})/
	latlongs=data.match(regex)
	if(latlongs != null){
		var points = latlongs[1]+","+latlongs[2]
		var latlngs=getLatLngObjList(points);
		if ($('#auto_clean').is(':checked')) {
			removeMarkers();
		}
		var markerStart = getCircle(latlngs[0],3,"#336699");
		var markerEnd = getCircle(latlngs[1]);
		var line = L.polyline(latlngs, {color: getRandomColor()});
		line.addTo(map);
		markerStart.addTo(map);
		markerEnd.addTo(map);
		markerArr.push(markerStart);
		markerArr.push(markerEnd);
		lineArr.push(line)
		map.fitBounds(line.getBounds());
	}
}
var errmsg="Timeout, please try: <ul><li>Query it again </li>" +
										 "<li>Query it on another db</li>"+
										 "<li>Do it in psql client</li>" + 
										 "<li>Contact with Yong Yang</li>" + 
										 "</ul>";
function queryWayIDList(dbhost, dbname, tmcid, region){
	url="/webtool/queryByTMC.sh?table=ways&dbhost="+dbhost+"&dbname="+dbname+"&region="+region + "&id="+tmcid;	
	$.ajax({
			type: "GET",
			url: url,
			dataType: "text",
			timeout:5000,
			success: function(data) {
				if(!$.trim(data))
					$('#query_out').html(tmcid + " not found!")
				$('#trafficPane').html(data)
			}, 
			error: function(x, t, m) {
				$('#query_out').html("query failed, please do it in psql client")
				if(t=="timeout")
    			{     
					$('#query_out').html("5 seconds " + errmsg)
    			}
			}
		});
}

function queryWayID(dbhost, dbname, wayid, region, tags, adminId, cleanTmcList=false){
	url="/webtool/queryByid.sh?"
	if(wayid) {
		regex=/(\-?\d+\.\d+,\s*\-?\d+\.\d+)/
		latlongs=wayid.match(regex)
		if(latlongs != null){
			
			url="/webtool/queryByLatLon.sh?"
			url+="point="+latlongs[0].replace(/\s/g,'')
		}else{
			url+="id="+wayid
		}
		url+="&"
	}
	url+="table=ways&dbhost="+dbhost+"&dbname="+dbname+"&region="+region;
	if(tags){
		keyValue=tags.split(/=(.+)/)
		if(keyValue.length>1)
			url+="&tags_key="+keyValue[0]+"&tags_value="+keyValue[1]
		else if(keyValue.length==1)
			url+="&tags_key="+keyValue[0]
	}
	if(adminId) {
		url+="&adminid="+adminId	
	}
//	console.log(url)
	$.ajax({
			type: "GET",
			url: url,
			dataType: "text",
			timeout:30000,
			beforeSend: function(){
            	$('#query_out').html("data is loading... <br> you may wait up to 30 seconds")
			},
			success: function(data) {
				$('#query_out').html(data)
				showWayOnMap(data)
				if(cleanTmcList)
					$('#trafficPane').html("")
			}, 
			error: function(x, t, m) {
				$('#query_out').html("query failed, please do it in psql client")
				if(t=="timeout")
    			{     
					$('#query_out').html("30 seconds " + errmsg)
    			}
			}
		});
}

function doSearch(){
	dbhost=$('#dbhost').val();
	dbname=$('#dbname').val();
	wayid=$('#wayid').val();
	region=$('#region').val();
	tags=$('#tags').val();
	tmcid=$('#tmcid').val();
	adminId=$('#adminId').val();
	if(tmcid)
		queryWayIDList(dbhost, dbname, tmcid, region)
	else
		queryWayID(dbhost, dbname, wayid, region, tags, adminId, true);
}

function openStats(){
	dbhost=$('#dbhost').val();
	dbname=$('#dbname').val();
	region=$('#region').val();
	url="/webtool/queryStats.sh?dbhost=" + dbhost + "&dbname=" +dbname + "&region="+region
	window.open(url)
}

function getDbTables(region='NA') {
	$.ajax({
			type: "GET",
			url: "/webtool/dbTable.sh?region="+region,
			dataType: "text",
			success: function(data) {
				$('#db_nav').html(data)
				regex=/viewDB\(\"(.*)\","(UniDB_.+RC.*)"/g
				tables=data.match(regex)
				latestTable=tables[tables.length - 1];
				tables=latestTable.match(/viewDB\(\"(.*)\","(UniDB_.+RC.*)\","/)
				host=tables[1]
				table=tables[2]
				viewDB(host,table,region)
				if(region == "NA" || region == "EU"){
					map.removeLayer(hereMap)
					map.addLayer(dp2)
				}else{
					map.removeLayer(dp2)
					map.addLayer(hereMap)
				}
			}, 
			error: function() {
				
			}
		});
}
getDbTables()

$('a[data-toggle="tab"]').on('click', function(event) {
      		getDbTables($(event.target).attr('region'));
      		$('#submit').trigger('click');
    	});

$('form').keypress(function (e) {
  if (e.which == 13) {
    doSearch();
//    return false;    //<---- Add this line
  }
});