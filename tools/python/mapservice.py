#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import json, md5, os, re, time
import curlutils, cacheutils, jsonutils
from places import LatLon
from maputils import *


def apiSignature(key, secret):
    # api-key + “:” + timestamp + “:” + MD5 (api-key + “:” + timestamp + “:” +api-secret)
    timestamp = int(time.time())
    # print timestamp
    s = '%s:%d:%s' % (key, timestamp, secret)
    # print 'signature(plain):' + s
    m = md5.new(s)
    d = m.hexdigest()
    ret = '%s:%d:%s' % (key, timestamp, d)
    # print ret
    return ret


def singleton(class_):
    instances = {}
    def getInstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]
    return getInstance


@singleton
class CloudServiceConfigDelegate(object):
    """delegate for the config
    """
    def __init__(self):
        f = open('mapservice.config.json')
        d = jsonutils.loads(f.read())
        cfg = d[d['default']]
        print 'mapservice config:', cfg
        self.baseUrl = cfg['mapservice_base_url']
        self.apikey = cfg['api_key']
        self.apisecret = cfg['api_secret']


class BaseDirectionsResponse(object):
    ''' base class of DirectionsResponse
    '''
    def __init__(self, raw):
        ''' constructor
        @param raw: raw response
        '''
        self.status = False
        self.distance = 0
        self.travel_time = 0
        self.rawdata = raw


class AbstractMapService(object):
    ''' base class of map service
    '''
    def directions(self, orig, dest, avoidToll=False, useCache=False):
        ''' calculate direction from orig to dest
        @param orig : object of LatLon
        @param dest : object of LatLon
        @param avoidToll: avoid toll flag, True, means we should avoid toll. False, vice versa
        @useCache : use cache flag
        '''
        raise NotImplementedError


    def parseDirectionsResponse(self, rawdata):
        ''' parsing rawdata to get BaseDirectionsResponse
        @param rawdata : response from directions 
        @return : instance of BaseDirectionsResponse
        '''
        raise NotImplementedError


class DirectionsResponse(BaseDirectionsResponse):
    ''' class of DirectionsResponse
    '''
    def __init__(self, raw):
        ''' constructor
        @param raw: raw response
        '''
        super(DirectionsResponse, self).__init__(raw)
        d = jsonutils.loads(raw)
        if 'status' in d and 'status' in d['status'] and 11200 == d['status']['status']:
            self.status = True
        if 'route' in d and len(d['route']) >= 1:
            # pick the first route
            droute = d['route'][0]
            if 'route_info' in droute:
                dRI = droute['route_info']
                if 'travel_dist_in_meter' in dRI:
                    self.distance = dRI['travel_dist_in_meter']
                if 'travel_time_in_second' in dRI:
                    self.travel_time = dRI['travel_time_in_second']


class MapService(AbstractMapService):
    ''' Python wrapper of Telenav map service
    '''

    def directions(self, orig, dest, avoidToll=False, useCache=True):
        ''' ref: http://spaces.telenav.com:8080/display/ScoutMobileSDK/Directions+Request+Definition
        @param orig : object of LatLon
        @param dest : object of LatLon

        this api is dedicated for avoid toll case generator.
        If we have any other request. we can change to more general format api : directions(self, orig, dest, params). params in dictionary
        # e.g.: Internal 'http://ec2s-ngxrouting-01.stg.mypna.com:8080/more/directions/v4/json?&origin=42.58324,-83.01925&destination=42.52405,-83.03204&time=2017-3-15T12:17Z&avoid=hov,traffic,unpaved&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=1&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true'
        # or (External)
        # e.g.: http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=31.860742,-116.624825&destination=32.286902,-115.102543&avoid=hov,traffic,unpaved&time=2017-03-21T23:46Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=1&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490140001:d43d7da80e45410730af866d0ce6623e
        '''
        # oneline format
        # url =  '%s/json?&origin=%s&destination=%s&time=%s&avoid=hov,traffic,unpaved&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=1&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true' % (CloudServiceConfigDelegate().baseUrl, orig, dest, time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()))
        
        # multiline format
        url = '%s/json?' % CloudServiceConfigDelegate().baseUrl
        # setup parameters
        # origin (required)
        url = '%s&origin=%s' % (url, orig)
        # destination (required)
        url = '%s&destination=%s' % (url, dest)
        # mode (optional, default=fastest, [fastest|pedestrian])
        # avoid (optional, [tolls,highway,hov,ferries,traffic])
        # url = '%s&avoid=hov,traffic,unpaved,tolls' % url
        url = '%s&avoid=hov,traffic,unpaved' % url
        if avoidToll:
            url = '%s,tolls' % url
        # heading (optional, default:1)
        # speed_in_mps(optional)
        # must_avoid_eids (optional)
        # try_avoid_eids (optional) 
        # avoid_traffic_ids (optional)
        # waypoints (optional) 
        
        # if useCache is True, skip duplicate http request
        # other parameters
        url = '%s&time=%s&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true' % (url, time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()))

        if CloudServiceConfigDelegate().apikey and CloudServiceConfigDelegate().apisecret:
            url = '%s&api_key=%s&api_signature=%s' % (url, CloudServiceConfigDelegate().apikey, apiSignature(CloudServiceConfigDelegate().apikey, CloudServiceConfigDelegate().apisecret))
        
        print 'url: ' + url
        # cmd = 'curl --compressed \'%s\'' % url
        cmd = 'curl \'%s\'' % url
        #cmd = 'curl "%s"' % url

        output = ''
        if useCache:
            # mo = re.search(r'^curl --compressed \'([^\?]+\?)((?:&?[^&=]+=[^&=]+)*)\'$', cmd)
            mo = re.search(r'^curl \'([^\?]+\?)((?:&?[^&=]+=[^&=]+)*)\'$', cmd)
            #mo = re.search(r'^curl "([^\?]+\?)((?:&?[^&=]+=[^&=]+)*)"$', cmd)
            if None == mo:
                print 'parsing curl command to get baseurl and query failed. cmd = %s' % cmd
                exit(-1)
            #print '\nmo:',mo.groups()
            baseurl = mo.groups()[0]
            query = mo.groups()[1]
            matches = re.findall(r'(?:&?([^&=]+)=([^&=]+))', query)
            #print
            cachedUrl = baseurl
            for t in matches:
                #print '%s=%s' % t
                if 'time' == t[0] or 'api_signature' == t[0]:
                    cachedUrl = '%s&%s=%%s' % (cachedUrl, t[0])
                else:
                    cachedUrl = '%s&%s=%s' % (cachedUrl, t[0], t[1])
            print '\ncached url:', cachedUrl
            output = cacheutils.retrieve(cachedUrl, 'tmp/map')
            if output:
                d = json.loads(output)
                if useCache and 'status' in d and 'status' in d['status'] and 11200 == d['status']['status']:
                    return output
        cmd = '%s --retry 3' % cmd  # max attemps is 3
        output = curlutils.query(cmd)
        #output = curlutils.cachedQuery(cmd, 'tmp')

        try:
            d = json.loads(output)
            if useCache and 'status' in d and 'status' in d['status'] and 11200 == d['status']['status']:
                cacheutils.store(cachedUrl, 'tmp/map', output)
        except ValueError as e:
            if 'No JSON object could be decoded' in e:
                print 'invalid direction response : ',output.splitlines()[0]
            print 'timeout request : ',cmd
            
            # try to query internally
            # TODO, zexings, use map config to mapping external url -> internal url
            if 'http://denali.telenav.com/maps/my18_na/directions' in cmd:
                cmd = cmd.replace('http://denali.telenav.com/maps/my18_na/directions', 'http://ec2s-ngxrouting-01.stg.mypna.com:8080/more/directions/v4')
                print 'internal cmd : ', cmd
                output = curlutils.query(cmd)
                if 'java.net.SocketTimeoutException: Read timed out' in output:
                    print 'internal request timeout'
                d = json.loads(output)
                if useCache and 'status' in d and 'status' in d['status'] and 11200 == d['status']['status']:
                    cacheutils.store(cachedUrl, 'tmp/map', output)
        # print output

        # parsing output
        # reference: http://svn.telenav.com/tn/avengers/Map/trunk/bindings/iOS/MapDataModel/MapDataModel/Route/Route+Serialization.m
        # http://svn.telenav.com/tn/avengers/Map/trunk/bindings/iOS/MapDataModel/MapDataModel/Route/GuidanceSegment+Serialization.m
        # http://svn.telenav.com/tn/avengers/Map/trunk/bindings/iOS/MapDataModel/MapDataModel/Route/Edge+Serialization.m
        
        # d = json.loads(output)
        # # print '\n\n',d
        # print '\n',d.keys()
        # print 'route.len:',len(d['route'])
        # # for route in d['route']:
        # #     print 'route.keys:',route.keys()
        # r = d['route'][0]
        # print 'segment.len:',len(r['segment'])
        # pts = []
        # ids = []
        # nids = []
        # for segment in r['segment']:
        #     # print 'segment.keys:',segment.keys()
        #     for edge in segment['edge']:
        #         points = decodePolyline(edge['encoded_polyline'].encode('utf-8'))
        #         pts.append(points)
        #         edgeIds = edge['map_edge_id']
        #         edgeIds = map(lambda s : s.encode('utf-8'), edgeIds)
        #         if 'toll' in edge and edge['toll']:
        #             print 'toll?', edge['toll']
        #             ids.append(edgeIds)
        #         else:
        #             nids.append(edgeIds)
        # #   convert segment.edge[i].encoded_polyline -> shape points
        # # print pts
        # print
        # print 'toll edges:', ids
        # print 'no toll edges:', nids
        return output


    def parseDirectionsResponse(self, rawdata):
        ''' parsing rawdata to get DirectionsResponse
        @param rawdata : response from directions 
        @return : instance of DirectionsResponse
        '''
        return DirectionsResponse(rawdata)


class GoogleDirectionsResponse(BaseDirectionsResponse):
    ''' class of GoogleDirectionsResponse
    '''
    def __init__(self, raw):
        ''' constructor
        @param raw: raw response
        '''
        super(GoogleDirectionsResponse, self).__init__(raw)
        d = jsonutils.loads(raw)
        if 'status' in d and 'OK' == d['status']:
            self.status = True
        if 'routes' in d and len(d['routes']) > 0:
            droute = d['routes'][0]
            if 'legs' in droute:
                if len(droute['legs']) > 1:
                    print 'WARNING: you may add waypoints to get direction. not implemented YET'
                    exit(0)
                dleg = droute['legs'][0]
                if 'distance' in dleg and 'value' in dleg['distance']:
                    self.distance = dleg['distance']['value']
                if 'duration' in dleg and 'value' in dleg['duration']:
                    self.travel_time = dleg['duration']['value']


class GoogleMapService(AbstractMapService):
    ''' google map service
    '''

    def directions(self, orig, dest, avoidToll=False, useCache=False):
        ''' calculate directions

        @param orig : object of LatLon
        @param dest : object of LatLon

        Ref : https://developers.google.com/maps/documentation/directions/intro 
        e.g.: https://maps.googleapis.com/maps/api/directions/json?origin=75+9th+Ave+New+York,+NY&destination=MetLife+Stadium+1+MetLife+Stadium+Dr+East+Rutherford,+NJ+07073&key=AIzaSyBkZX3j3eSD0eM0JUU_RA0tjpqQzDLgDaM&avoid=tolls|highways
        '''
        url = 'https://maps.googleapis.com/maps/api/directions/json?origin=%s&destination=%s' % (orig, dest)
        url = '%s&key=AIzaSyBkZX3j3eSD0eM0JUU_RA0tjpqQzDLgDaM' % url
        if avoidToll:
            url = '%s&avoid=tolls' % url
        print 'url: ',url
        cmd = 'curl \'%s\'' % url
        output = curlutils.cachedQuery(cmd, 'tmp')
        # print output
        return output


    def parseDirectionsResponse(self, rawdata):
        ''' parsing rawdata to get GoogleDirectionsResponse
        @param rawdata : response from directions 
        @return : instance of GoogleDirectionsResponse
        '''
        return GoogleDirectionsResponse(rawdata)


if __name__ == '__main__':
    print 'unittest for MapService'
    # config internal
    # CloudServiceConfigDelegate('http://ec2s-ngxrouting-01.stg.mypna.com:8080/more/directions/v4')
    
    # config for lahaina, RMU
    # CloudServiceConfigDelegate('https://avengers.telenav.com/maps/v4/directions', 'WDz0QzprPMKPU1f3JdPeDAzC_eoa', 'huzjBVEFXZPE41IyHwUpZGtaQbUa')
    
    # config for denali NA MY18 stage
    # CloudServiceConfigDelegate('http://denalistage.telenav.com/maps/my18_na/directions', 'c596e95b-a655-4b7b-b346-208888d85a33', '0c96fff5-d764-4703-84fb-67980adf2893')
    
    # config for denali EU MY18 stage
    # CloudServiceConfigDelegate('http://denalistage.telenav.com/maps/my18_eu/directions', 'c596e95b-a655-4b7b-b346-208888d85a33', '0c96fff5-d764-4703-84fb-67980adf2893')

    # direction
    ms = MapService()
    # NA case
    # orig = LatLon(42.58324, -83.01925)
    # dest = LatLon(42.52405, -83.03204)
    
    # failed case 1
    orig = LatLon(18.651739,-91.814920)
    dest = LatLon(25.914026,-97.489086)
    # EU case
    # orig = LatLon(50.157856, 8.676996)
    # dest = LatLon(50.148098, 8.667125)
    # ms.directions(orig, dest)
    # apiSignature('2tBN2LrJ8T1nV07cnupLFQvkMrJg', 'AOIm8U_UTApfsJFvBy6RzUL8hNeQ')

    ms = GoogleMapService()
    ms.directions(orig, dest)

# failed cases
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=18.651739,-91.814920&destination=25.914026,-97.489086&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=26.070402,-98.296393&destination=19.844265,-90.536208&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=26.070402,-98.296393&destination=18.498394,-88.304164&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=19.844265,-90.536208&destination=22.217047,-97.846366&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=19.844265,-90.536208&destination=22.248548,-97.839731&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=19.844265,-90.536208&destination=26.204369,-98.230082&avoid=hov,traffic,unpaved&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
# http://denalistage.telenav.com/maps/my18_na/directions/json?&origin=22.217047,-97.846366&destination=19.844265,-90.536208&avoid=hov,traffic,unpaved,tolls&time=2017-03-22T02:44Z&max_route_number=1&api_version=V4&eta_only=false&edge_detail=true&with_traffic_id=true&overview=false&deviation_count=0&speed_limit=true&lane_info=true&map_source=OSM&traffic_source=default&locale=ENG&junction_view=ejv,gjv&natural_guidance=junction&extra_info=true&api_key=c596e95b-a655-4b7b-b346-208888d85a33&api_signature=c596e95b-a655-4b7b-b346-208888d85a33:1490150667:f557a979d0e41289bedcffd7f2609b1e
