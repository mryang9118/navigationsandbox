#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.

import math
from places import *
import jsonutils

# http://wiki.openstreetmap.org/wiki/Mercator#Python

def y2lat(a):
    ''' reverse mercator project for latitude
    '''
    return 180.0/math.pi*(2.0*math.atan(math.exp(a*math.pi/180.0))-math.pi/2.0)

def lat2y(a):
    ''' mercator project for latitude
    '''
    return 180.0/math.pi*math.log(math.tan(math.pi/4.0+a*(math.pi/180.0)/2.0))


def decodeNumber(cypher, i):
    ''' parse cypher text to get number
    @param cypher : encoded string
    @param i : start index
    @return: float number
    '''
    shift = 0
    result = 0
    while True:
        # NOTE: zexings, in iOS implementation, by default char is signed
        # https://developer.apple.com/library/content/documentation/Xcode/Conceptual/iPhoneOSABIReference/Articles/ARM64FunctionCallingConventions.html#//apple_ref/doc/uid/TP40013702-SW1
        # This can be changed in xcode, there is a 'char' Type is unsigned option (which defaults to off). If this is changed to "yes", xcode will pass -funsigned-char to llvm. 
        # print 'cypher[i]:',cypher[i]
        b = ord(cypher[i]) - 63
        if b < -256:
            b += 256
            print 'ERROR: out of boundary, cypher[i] = ',cypher[i]
            exit(0)
        i += 1
        result |= (b & 0x1f) << shift
        shift += 5
        if b < 0x20:
            break
    n = (result >> 1) if 0 == (result & 1) else ~(result >> 1)
    return (n, i)


def decodePolyline(encodedPoints):
    '''decode polyline from cypher string
    @param encodedPoints: cypher text
    @return: [LatLon,...]
    
    Reference : https://github.com/hicsail/polyline
    '''
    l = len(encodedPoints)
    i = 0
    lat = 0
    lng = 0
    shapePoints = []
    while i < l:
        (dlat, i) = decodeNumber(encodedPoints, i)
        lat += dlat
        (dlng, i) = decodeNumber(encodedPoints, i)
        lng += dlng
        ll = LatLon(lat * 1e-5, lng * 1e-5)
        shapePoints.append(ll)
    return shapePoints


def decodeMapEdgeID(id):
    ''' parsing map edge id
    @return: {
        'wayId' : wayId,
        'x' : x,
        'y' : y,
        'isBackward' : backward,
        'directedEdgeId' : directedEdgeId
    }
    '''
    ss = id.split('|')
    assert(4 == len(ss))
    backward = False
    wayId = ss[0]
    if '-' == wayId[0]: # backward
        backward = True
        wayId = wayId[1:]
    x = ss[1]
    y = ss[2]
    directedEdgeId = ss[3]
    return {
        'wayId' : wayId,
        'x' : x,
        'y' : y,
        'isBackward' : backward,
        'directedEdgeId' : directedEdgeId
    }


def decodeMapEdgeIDs(ids):
    ''' parsing map edge id array
    @return: [{
        'wayId' : wayId,
        'x' : x,
        'y' : y,
        'isBackward' : backward,
        'directedEdgeId' : directedEdgeId
    }]
    '''
    infos = []
    for id in ids:
        infos.append(decodeMapEdgeID(id))
    return infos


def wayidUniDB2NGX(wayid):
    '''convert unidb id -> ngx id for way
    '''
    if wayid.endswith('100'):
        return wayid[:-len('100')]
    print 'invalid unidb wayid:', wayid


def wayidNGX2UniDB(wayid):
    '''convert ngx id -> unidb id for way
    '''
    return '%s100' % wayid


def edgesInSegment(wayids, segment):
    ''' check whether this segment contains at least one of edge in wayids
    @param wayids : set of wayid to test
    @param segment: segment dictionary
    @return: list of wayids that occur in both segment and [wayids]
        [] vice versa
    '''
    # print 'segment.keys:',segment.keys()
    # print 'edge.len:',len(segment['edge'])
    ret = []
    for edge in segment['edge']:
        # points = decodePolyline(edge['encoded_polyline'].encode('utf-8'))
        edgeIds = edge['map_edge_id']
        # edgeIds = map(lambda s : s.encode('utf-8'), edgeIds)
        
        for edgeInfo in decodeMapEdgeIDs(edgeIds):
            ngxwayid = edgeInfo['wayId']
            wayid = wayidNGX2UniDB(ngxwayid)
            # print ngxwayid, '~', wayid
            if wayid in wayids:
                ret.append(wayid)
    return ret


def edgesInRoute(wayids, route):
    ''' check whether this route contains at least one of edge in wayids
    @param wayids : set of wayid to test
    @param route: route dictionary
    @return: list of wayids that occur in both route and [wayids]
        [] vice versa
    '''
    # print 'segment.len:',len(route['segment'])
    ret = []
    for segment in route['segment']:
        tmp = edgesInSegment(wayids, segment)
        if tmp:
            ret += tmp
    return ret


def edgesInRouteResponse(wayids, response):
    ''' check whether this route response contains at least one of edge in wayids
    @param wayids : set of wayid to test
    @param response: route response in json string
    @return: list of wayids that occur in both response and [wayids]
        [] vice versa
    
    the reason to return list instead of set:
        we need to keep the sequence of wayids
    '''
    d = jsonutils.loads(response)
    if 'route' not in d:
        print 'no route find'
        return []
    ret = []
    for route in d['route']:
        tmp = edgesInRoute(wayids, route)
        if tmp:
            ret += tmp
    return ret


if __name__ == '__main__':
    # decode polyline test
    pts = ['i`|bGnquyN`DC', 'g{{bGjquyNbDE', 'cv{bGdquyNhD@', 'yp{bGfquyNDfD', 'sp{bGnvuyNBfB', 'op{bGvyuyNDjD', 'ip{bGb_vyNBxB', 'ep{bG|bvyNJzK', 'yo{bGxovyNB`B@pA', 'so{bGluvyN?p@?fC@pBBfD', 'mo{bG`dwyNPvK', '{n{bGxpwyN@fA', 'yn{bG`swyNH~D', 'on{bG`ywyNcA@', 'sp{bGbywyNi@@', '}q{bGdywyNm@@', 'ks{bGfywyNW?[@gABo@@', 'wx{bGnywyNGNENAJ@LDL', '_y{bGv{wyNtCG', 'it{bGn{wyNp@A', 'wr{bGl{wyNhCG', 'mn{bGd{wyNz@Ax@AV?', '_j{bG`{wyNXAt@A', 'og{bG|zwyNf@?', 'gf{bG|zwyNnAAjAA', 'ka{bGxzwyN\\AhAA', 'c~zbGtzwyN~ACtCEZ?dAA', 'kszbGhzwyNnBC', '{ozbGdzwyN|@A', '}mzbGbzwyNxAC', 'ckzbG~ywyN~@A|@A', 'egzbGzywyN~@CdBCv@A', 'g`zbGpywyNdAA', 'a~ybGnywyNtBE', 'kzybGhywyNbAC', 'gxybGdywyNvAA', 'ouybGbywyNn@Av@A', 'grybG~xwyNtEK', 'qkybGrxwyNbCE', 'mgybGlxwyNh@A', 'cfybGjxwyNnCG', 'saybGbxwyNnBC', 'c~xbG~wwyNj@A', 'w|xbG|wwyNjAEtAC', 'uwxbGrwwyNfAEdAA', 'gsxbGjwwyNh@?f@?', 'upxbGjwwyNTAdAA', 'ymxbGfwwyN`AC', 'wkxbGbwwyN~ACl@An@A', 'yexbGzvwyNrCE', 'eaxbGtvwyNxFI', 'kywbGjvwyNbKK', 'gmwbG~uwyN`CE', 'eiwbGxuwyNdEGzACZA', 'g_wbGjuwyNdBE', 'a|vbGduwyNfAC', 'yyvbG`uwyNl@A', 'kxvbG~twyNhAC', 'avvbGztwyNvGO', 'imvbGjtwyNtAC', 'sjvbGftwyNtBC', '}fvbGbtwyNrBE', 'icvbG|swyN^A', 'ibvbGzswyNvCG', 'q}ubGrswyNbCE', 'myubGlswyNl@A', '_xubGjswyNzAC', 'cuubGfswyNxEI', 'inubG|rwyNpBE', 'wjubGvrwyNfAGt@K`@E', 'weubG|qwyNPC|@U', 'gcubGbqwyNjLQ', '{utbGppwyNvBEfCC|A@rBB', 'igtbGlpwyNvADhCLzDP', 'kzsbGrqwyNlNt@', '}jsbGhswyNbAD', 'yhsbGnswyNb@@', 'ugsbGpswyNx@D', '{esbGvswyNzAH', '_csbG`twyNdABrA@', 'e~rbGftwyN`@?', 'c}rbGftwyNnAA', 'szrbGdtwyNv@A', '{xrbGbtwyNnDC', 'ksrbG~swyNjFC', '_lrbGzswyNzBCjIE', 'w}qbGpswyN~A?', 'wzqbGpswyNN?', 'gzqbGpswyN|JE', 'inqbGjswyNbEI', 'ehqbG`swyNtGG', 'o_qbGxrwyN~CGhBCF?', '}vpbGlrwyNrAA', 'itpbGjrwyNrCC', 'uopbGfrwyNr@A', 'anpbGdrwyNb@A', '}lpbGbrwyNMbE', 'kmpbGfxwyNCx@', 'ompbG`zwyNWdJ']
    print pts
    for c in pts:
        print decodePolyline(c)
    
    # decode mapEdgeId
    ids = [['-19623611|36157279|49530353|367207881'], ['-19623637|36157290|49530768|367207885'], ['-19623649|36157286|49531198|367207889'], ['-127291816|36156973|49531214|352985981'], ['-895099564|36156779|49531224|352985985'], ['-895099563|36156458|49531239|352985989'], ['-19624268|36156231|49531249|352985993'], ['-895099565|36155463|49531279|352985997'], ['-895099566|36155127|49531295|352986001'], ['-872997297|36154255|49531310|352986005'], ['-977416086|36153494|49531355|352986009'], ['-1051322865|36153360|49531360|352986013'], ['-1051322864|36153002|49531386|352986017'], ['1051322866|36153002|49531386|350033584'], ['1051322867|36152999|49531214|350033580'], ['1051323067|36152995|49531107|350033576'], ['1051323068|36152991|49530991|350033572'], ['19625964|36152976|49530555|350035172'], ['-1051323425|36152857|49530915|350033817'], ['-1051323427|36152861|49531041|350033813'], ['-1051323426|36152876|49531391|350033809'], ['-1051324468|36152883|49531750|350033805'], ['-1051324467|36152890|49531953|350033801'], ['-1051323429|36152890|49532054|350033797'], ['-1051323428|36152898|49532449|350033793'], ['-19625696|36152905|49532712|350033789'], ['-1053152522|36152928|49533583|350033785'], ['-1053152524|36152935|49533867|350033781'], ['-1053152523|36152939|49534019|350033777'], ['-19625672|36152946|49534251|350033773'], ['-19625673|36152954|49534570|350033769'], ['-19704416|36152972|49535132|350033765'], ['-1053281770|36152976|49535310|350033761'], ['-1053281769|36152987|49535608|350033757'], ['-1053152525|36152995|49535780|350033753'], ['-19625674|36152999|49536003|350033749'], ['-19704427|36153006|49536266|350033745'], ['-1053281768|36153028|49536808|350033741'], ['-1053281767|36153040|49537142|350033737'], ['-19625675|36153043|49537248|350033733'], ['-19704434|36153058|49537613|350033729'], ['-16895119|36153066|49537896|350033725'], ['-16895118|36153069|49538008|350033721'], ['-1051523282|36153088|49538418|350033717'], ['-1051523281|36153103|49538777|350033713'], ['-19625678|36153103|49538985|350033709'], ['-1051523270|36153110|49539218|350033705'], ['-1053288064|36153118|49539385|350033701'], ['-1053288063|36153133|49539866|350033697'], ['-127290629|36153144|49540240|350692797'], ['-127290633|36153163|49540873|350692801'], ['-127290636|36153185|49541855|350692805'], ['-127290635|36153196|49542184|350692809'], ['-1052675363|36153222|49542989|350692813'], ['-1052675362|36153233|49543247|350692817'], ['-16895161|36153241|49543429|350692821'], ['-1052835210|36153245|49543545|350692825'], ['-1052835209|36153252|49543733|350692829'], ['-1052843566|36153282|49544441|350692833'], ['-1052843565|36153289|49544659|350692837'], ['-127290642|36153297|49544958|350692841'], ['-127290641|36153308|49545251|350692845'], ['-16895163|36153312|49545332|350692849'], ['-1051379886|36153327|49545717|350692853'], ['-1051379885|36153338|49546051|350692857'], ['-16895165|36153342|49546167|350692861'], ['-1051379888|36153349|49546400|350692865'], ['-1051379887|36153368|49546952|350692869'], ['-127290645|36153379|49547240|350692873'], ['-990723944|36153427|49547645|350692877'], ['-990723943|36153476|49547847|350692881'], ['-19624456|36153509|49548930|351083125'], ['-19624457|36153517|49550109|351083121'], ['-19624458|36153446|49551157|351083117'], ['-19625337|36153345|49552407|351083113'], ['-977229809|36153334|49552579|351083109'], ['-977229808|36153330|49552670|351083105'], ['-977229804|36153319|49552817|351083101'], ['-1051472250|36153301|49553049|351083097'], ['-1051472249|36153289|49553439|351083093'], ['-19528132|36153289|49553525|351083089'], ['-1051472252|36153293|49553727|351083085'], ['-1051472251|36153297|49553869|351083081'], ['-135469841|36153304|49554314|351083077'], ['-135469839|36153312|49554911|351083073'], ['-115608764|36153330|49556065|351083069'], ['-115608763|36153330|49556308|351083065'], ['-20068488|36153330|49556348|351083061'], ['-20172852|36153342|49557314|351083057'], ['-20172856|36153360|49557810|351083053'], ['-20172855|36153375|49558513|351083049'], ['-123195346|36153397|49559207|351083045'], ['-19524800|36153401|49559419|351083041'], ['-1051574584|36153409|49559793|351083037'], ['-1051574583|36153412|49559925|351083033'], ['-19525622|36153416|49560016|351083029'], ['1051574579|36153416|49560016|352977836'], ['1051574580|36153051|49559981|352977840'], ['1051574578|36152943|49559970|352977844']]
    print ids
    for a in ids:
        print decodeMapEdgeIDs(a)
            
