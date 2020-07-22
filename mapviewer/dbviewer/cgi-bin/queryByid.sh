#!/bin/bash
echo "Content-type: text/html"
echo ''
function Usage {
echo "<div class="view"><div class='alert alert-warning alert-dismissable' contenteditable='true'>"
[ -z $dbhost ] && { echo "<strong>dbhost</strong> not specified; "; } ||
([ -z $dbname ] && { echo "<strong>dbname</strong> not specified; "; }) ||
([ -z $id ] && { echo "<strong>id</strong> not specified, retrieve one randomly ..."; })
echo "</div></div>"
}
dbhost="hqd-ssdpostgis-05.mypna.com"
dbname="UniDB_HERE_EU16Q3_1.0.0.467919-20161202184147-RC"
table="deuway"
region="eu"
[ -z $QUERY_STRING ] && { Usage; exit 0; }
eval `echo $QUERY_STRING|tr '&' ';'`

[ -z $dbhost ] && { Usage; exit 0; }
[ -z $dbname ] && { Usage; exit 0; }
sql="select replace(ST_AsLatLonText(ST_PointN(linestring,1),'D.DDDDDD'), ' ', ','),replace(ST_AsLatLonText(ST_EndPoint(linestring),'D.DDDDDD'), ' ', ','),id,tags from $table where "
[ -z $id ] && { 
[ -z $tags_key ] && Usage; 
sql=$sql"tags?'fc'";
randomCondition=" and random()<0.01";
[ ! -z $tags_key ] && [ ! -z $tags_value ] && { condition=" and tags->'"$tags_key"'='"$tags_value"'"; [ $tags_key == "tmcid" ] && { randomCondition=""; } } 
[ ! -z $tags_key ] && [ -z $tags_value ] && { condition=" and tags?'"$tags_key"'"; } 
sql=$sql$condition$randomCondition" limit 1;"; 
} || { [[ $id =~ .*"100" ]] || id=$id"100"; sql=$sql"id="$id";"; }
region=`echo $region|tr '[:upper:]' '[:lower:]'`

function queryid
{
out=`PGPASSWORD=postgres psql -t -h $dbhost -d $dbname -U postgres -c "$sql"`
}

queryid
start=`echo $out|cut -d"|" -f1|xargs`;
end=`echo $out|cut -d"|" -f2|xargs`;
id=`echo $out|cut -d"|" -f3|xargs`;
[ ! -z $id ] && {
echo "<div>"
echo "<p>Calculate a route passing way: <a href=http://ec2s-autodenali-ngxtile-na01.mypna.com/map/WebTool/route_viewer.html?&origin="$start"&destination="$end"&max_route_number=3&api_version=V4&server="$region"_den18_stage>$id</a> Start: $start End: $end </p>"
echo $out|cut -d"|" -f4-|xargs|tr ',' '\n'|awk '{print $0"<br>"}'
echo "</div>"
} || { echo "NOT FOUND"; }
