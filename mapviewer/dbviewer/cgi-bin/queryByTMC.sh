#!/bin/bash
echo "Content-type: text/html"
echo ''

function Usage {
echo "<div class="view"><div class='alert alert-warning alert-dismissable' contenteditable='true'>"
[ -z $dbhost ] && { echo "<strong>dbhost</strong> not specified; "; } ||
([ -z $dbname ] && { echo "<strong>dbname</strong> not specified; "; }) ||
([ -z $id ] && { echo "<strong>id</strong> not specified"; })
echo "</div></div>"
}
[ -z $QUERY_STRING ] && { Usage; exit 0; }
eval `echo $QUERY_STRING|sed 's/|/\\|/g'|tr '&' ';'`
id=`echo $QUERY_STRING|tr '&' '\n'|grep id|awk -F "=" '{print $2}'`
[ -z $id ] && { Usage; exit 0; }

tmcWayIdMappingTable="/data/02/data_archive/data_repo/traffic/here/tmc_wayid_mapping"
[ -d tmcWayIdMappingTable ] && { echo $region" tmc way id mapping not found, contact with YongYang"; exit 0; }
[ ! -z $region ] && [ ! -f $tmcWayIdMappingTable/$region ] && { echo $region" tmc way id mapping not found, contact with YongYang"; exit 0; }


function searchWayid
{
tmcIdPattern=$1
region=$2
firstC=`echo $tmcIdPattern|cut -c1`
([ $firstC == "+" ] || [ $firstC == "-" ]) && { tmcIdPattern="\\"$tmcIdPattern;}
for i in $tmcWayIdMappingTable/$region; do
res=`grep $tmcIdPattern $i`; 
[ ! -z "$res" ] && { 
	basename $i; 
	for tmc in $res; do 
		wayid=`echo $tmc|cut -d";" -f1`
		echo "<li><a href='#' onclick=\"queryWayID('"$dbhost"','"$dbname"','"$wayid"','"$region"','')\">"$tmc"</a></li>"; 
	done
}
done
}

function queryDB
{

if [ ! -z $dbhost ] && [ ! -z $dbname ]; then
	sql="select st_astext(ST_PointN(linestring,1)),id from ways where tags->'tmcid'='$id';"
	echo $sql
	ways=`PGPASSWORD=postgres psql -A -t -h $dbhost -d $dbname -U postgres -c "$sql"`
fi
	IFS=$'\n'
	echo "<ul>"
	for way in $ways; do
		wayid=`echo $way|cut -d"|" -f2`
		latlon=`echo $way|cut -d"|" -f1`
		echo "<li>$latlon <a href='/webtool/queryByid.sh?region=NA&id=$wayid'>$wayid</a><li>"
	done
	echo "</ul>"
}

searchWayid $id $region
