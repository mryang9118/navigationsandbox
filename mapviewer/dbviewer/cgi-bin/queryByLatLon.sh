#!/bin/bash
echo "Content-type: text/html"
echo ''
function Usage {
echo "<div class="view"><div class='alert alert-warning alert-dismissable' contenteditable='true'>"
[ -z $dbhost ] && { echo "<strong>dbhost</strong> not specified; "; } ||
([ -z $dbname ] && { echo "<strong>dbname</strong> not specified; "; }) ||
([ -z $point ] && { echo "<strong>point</strong> not specified"; })
echo "</div></div>"
}
dbhost="hqd-ssdpostgis-05.mypna.com"
dbname="UniDB_HERE_EU16Q3_1.0.0.467919-20161202184147-RC"
table="ways"
region="eu"
[ -z $QUERY_STRING ] && { Usage; exit 0; }
eval `echo $QUERY_STRING|tr '&' ';'`
[ -z $dbhost ] && { Usage; exit 0; }
[ -z $dbname ] && { Usage; exit 0; }
[ -z $point ] && { Usage; exit 0; }
region=`echo $region|tr '[:upper:]' '[:lower:]'`

function query
{
out=`PGPASSWORD=postgres psql -t -h $dbhost -d $dbname -U postgres -c "$1"`
}

point=`echo $point |awk -F ',' '{print "POINT("$2,$1")"}'`
sql="select replace(ST_AsLatLonText(ST_PointN(linestring,1),'D.DDDDDD'), ' ', ','),replace(ST_AsLatLonText(ST_EndPoint(linestring),'D.DDDDDD'), ' ', ','),id,tags from (select st_distance(linestring, 'SRID=4326;$point'::geometry) as d, ways.* from ways where tags?'fc' ORDER BY linestring <-> 'SRID=4326;$point'::geometry limit 100) c order by d limit 1;"
query "$sql"
start=`echo $out|cut -d"|" -f1|xargs`;
end=`echo $out|cut -d"|" -f2|xargs`;
id=`echo $out|cut -d"|" -f3|xargs`;
[ ! -z $id ] && {
echo "<div>"
echo "<p>Calculate a route passing way: <a href=http://ec2s-autodenali-ngxtile-na01.mypna.com/map/WebTool/route_viewer.html?&origin="$start"&destination="$end"&max_route_number=3&api_version=V4&server="$region"_den18_stage>$id</a> Start: $start End: $end </p>"
echo $out|cut -d"|" -f4-|xargs|tr ',' '\n'|awk '{print $0"<br>"}'
echo "</div>"
} || { echo "NOT FOUND"; }
