#!/bin/bash
echo "Content-type: text/html"
echo ''
region=""
eval `echo $QUERY_STRING|tr '&' ';'`

function getDb {
excludes="^$"
[[ $region == EU ]] && { excludes="TURKEY"; }
dblist=`PGPASSWORD=postgres psql -h $1 -U postgres -c '\l'|grep UniDB_.*$region|grep -v $excludes|awk '{print $1}'`
echo "<div class='list-group'>"
[[ $dblist == *$region* ]] && { echo "<span class='list-group-item list-group-item-info'>$1</span>"; }
for db in $dblist; do
parameter="dbhost=$1&dbname=$db"
[ ! -z $region ] && { parameter=$parameter"&region=$region"; }
echo "<a href='#' class=\"list-group-item\" data-toggle='collapse' style='font-size:9pt' onclick='viewDB(\"$1\",\"$db\",\"$region\")'>"$db"</a>"
done
echo "</div>"
}
getDb hqd-ssdpostgis-04.mypna.com
getDb hqd-ssdpostgis-05.mypna.com
getDb hqd-ssdpostgis-06.mypna.com
