#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import argparse, json, md5, os, re, sys, time, urllib
import cacheutils, curlutils, jsonutils, kmlhelper, mapservice, maputils, placeservice
from places import LatLon

# reference : http://stackoverflow.com/questions/956867/how-to-get-string-objects-instead-of-unicode-ones-from-json-in-python
# denali my18 release : http://spaces.telenav.com:8080/display/auto/Denali+MY18+Data+Release+Readiness+Review#DenaliMY18DataReleaseReadinessReview-ReleaseCandidate
#   http://spaces.telenav.com:8080/display/map/Data+Compilation-+Nav+S39+ending+20170331#DataCompilation-NavS39ending20170331-DenaliMY18NA16Q2SOP(Releasebasedata)-NGX,TrafficMerged
# NA cases : http://hqd-ssdpostgis-07.mypna.com/data_archive/data_repo/toll/NA.case
# https://developers.google.com/maps/documentation/directions/start


# for APIKEY and APISECRET : http://spaces.telenav.com:8080/display/map/Moving+NGX+cloud+routing+service+behind+Nautilus
# map service url : http://spaces.telenav.com:8080/display/auto/Request+URLs    --- not working
# map service api : http://spaces.telenav.com:8080/display/map/Map+Service+For+Denali

class TollCaseGenerator(object):
    ''' this is two points toll case generator
    tollcase format: {
        'start_point' : {
            'lat' : lat,
            'lng' : lng
        },
        'end_point' : {
            'lat' : lat,
            'lng' : lng
        },
        'ways' : [
            wayid0, wayid1, ...
        ]
    }
    '''
    def generate(self, tollcase, clz=placeservice.OverpassPopulationPlaceService):
        ''' generate toll case
        @param tollcase: {
            'start_point' : {
                'lat' : lat,
                'lng' : lng
            },
            'end_point' : {
                'lat' : lat,
                'lng' : lng
            },
            'ways' : [
                wayid0, wayid1, ...
            ]
        }
        @return
        '''
        print 'tollcase:', tollcase
        # 1. get start|end point nearby cities
        lat = float(tollcase['start_point']['lat'])
        lng = float(tollcase['start_point']['lng'])
        cities_start  = placeservice.getNearbyCities(lat, lng, limit = 10, clz = clz)
        lat = float(tollcase['end_point']['lat'])
        lng = float(tollcase['end_point']['lng'])
        cities_end  = placeservice.getNearbyCities(lat, lng, limit = 10, clz = clz)
        print 'cities_start:', cities_start
        print 'cities_end:', cities_end
        # TODO, zexings
        # 2. calculate route and check w/o toll. get toll ways coverage
        toll2odpairs = self.getODPairsForTollCase(cities_start, cities_end, tollcase)
        if len(toll2odpairs) == 0:
            # switch origin and destination
            start_point = tollcase['start_point']
            end_point = tollcase['end_point']
            
            tollcase['start_point'] = end_point
            tollcase['end_point'] = start_point
            toll2odpairs = self.getODPairsForTollCase(cities_end, cities_start, tollcase)
            
            tollcase['start_point'] = start_point
            tollcase['end_point'] = end_point
        print 'toll, orig->dest pairs:', toll2odpairs
        return toll2odpairs
    
    
    def getTollCaseCacheKey(self, tollcase):
        ''' get toll case cache key
        '''
        return jsonutils.dumps(tollcase)
    
    
    def getODPairsForTollCase(self, cities_start, cities_end, tollcase, limit=10, useCache=True):
        ''' get origin->destination pairs passing toll ways in tollcase['ways']
        @param cities_start: cities list near start point
        @param cities_end: cities list near start point
        @param tollcase: {
            'start_point' : {
                'lat' : lat,
                'lng' : lng
            },
            'end_point' : {
                'lat' : lat,
                'lng' : lng
            },
            'ids' : [
                wayid0, wayid1, ...
            ]
        }
        @param limit: constraint of orig->dest pair count in return
        @param useCache: if True, try to get result from cache
        cities is list of {
                'id' : id,
                'lat' : lat,
                'lon' : lon,
                'name' : name,
                'population' : population
            }
        @return: { 'orig2dests': pairs }
        orig2dests is list of orig->dest pair. [{
                'orig' : {
                    'name':city['name'],
                    'lat':city['lat'],
                    'lon':city['lon']
                },
                'dest' : {
                    'name':c2['name'],
                    'lat':c2['lat'],
                    'lon':c2['lon']
                }
            }]
        '''
        # print 'tollcase:', tollcase
        key = self.getTollCaseCacheKey(tollcase)
        orig2dests = cacheutils.retrieve(key, 'cases', 'tollcase')
        
        print 'len(orig2dests):', 0 if None == orig2dests else len(orig2dests)
        if orig2dests:
            cases_good = jsonutils.loads(orig2dests)
            if len(cases_good) > 0:
                return cases_good
            elif g_skip_empty_case:
                # print 'g_skip_empty_case is True, return'
                return cases_good
        
        ms = mapservice.MapService()
        cases_good = []
        cases_cannot_avoid_toll = []
        cases_do_not_through_toll = []
        cases_failed = []
        
        # set for wayids in this test case
        cur_tollset = set(tollcase['ids'])
        #print 
        #print 'tollset:', cur_tollset
        #print 'len(s):', len(cur_tollset), '\tlen(l):', len(tollcase['ids'])
        # all toll wayids in final origin->destination pairs
        passingset = set()
        # all common toll wayids in final origin->destination and cur_tollset
        commonset = set()
        for city in cities_start:
            # print '\tname', city['name']
            # print '\tlat,lon = {%f, %f}' % (city['lat'], city['lon'])
            for c2 in cities_end:
                if len(cases_good) >= limit:
                    break
                if city != c2:
                    print '\t',city['name'],'->',c2['name']
                    print '\t{%f,%f}->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                    orig = LatLon(city['lat'], city['lon'])
                    dest = LatLon(c2['lat'], c2['lon'])
                    output = ms.directions(orig, dest)
                    # print 'output:', output
                    pair = {
                        'orig' : {
                            'name':city['name'],
                            'lat':city['lat'],
                            'lon':city['lon']
                        },
                        'dest' : {
                            'name':c2['name'],
                            'lat':c2['lat'],
                            'lon':c2['lon']
                        }
                    }
                    if 'java.net.SocketTimeoutException: Read timed out' in output:
                        print '\tFAILED: {%f,%f}->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        cases_failed.append('\tFAILED: {%f,%f}->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon']))
                        continue
                    # passing_wayids = maputils.edgesInRouteResponse(tollcase['ids'], output)
                    passing_wayids = maputils.edgesInRouteResponse(g_tollset, output)
                    tmpset = set(passing_wayids)
                    tmpcommonset = tmpset & cur_tollset
                    if 0 < len(tmpcommonset):
                        print 'passing wayids: ', passing_wayids
                        commonset |= tmpcommonset
                        if 0 == len(tmpset - cur_tollset):
                            # TODO, zexings, modify edges in route response to collect all the toll edges
                            print 'all toll ways are in testcase'
                        else:
                            print 'WARNING. not all toll ways in tollcase'
                            print 'common:', tmpcommonset
                            print 'uncommon:', tmpset - cur_tollset
                            # exit(0)
                        print '\tOK: {%f,%f}->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        is_new_case = True
                        
                        for goodcase in cases_good[:]:
                            tmp2set = set(goodcase['ids'])
                            # print 'len(tmp2set):', len(tmp2set)
                            if len(tmpset - tmp2set) == 0:
                                # all toll edge can be find in previous origin -> destination case, skip it
                                # print 'all toll edge can be find in previous origin -> destination case, skip it'
                                is_new_case = False
                                break
                            elif len(tmp2set - tmpset) == 0:
                                # all toll edge can be find in current origin -> destination case, remove old one
                                # print 'all toll edge can be find in current origin -> destination case, remove old one'
                                cases_good.remove(goodcase)
                        # print 'len(tmpset):', len(tmpset)
                        # print 'is_new_case:', is_new_case
                        # print 'len(cases_good):', len(cases_good)
                        # exit(0)
                        if not is_new_case:
                            continue
                        pair['ids'] = passing_wayids
                        passingset |= tmpset
                        cases_good.append(pair)
                        # exit(0)
                        # TODO, zexings
                        # output2 = ms.directions(orig, dest, True)
                        # if 'java.net.SocketTimeoutException: Read timed out' in output2:
                        #     print '\tFAILED: {%f,%f}-notoll->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        #     cases_failed.append('\tFAILED: {%f,%f}<-{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon']))
                        #     continue
                        #
                        # if not maputils.edgesInRouteResponse(wayid, output2):
                        #     print '\tGOOD: {%f,%f}-notoll->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        #     # TODO, generate kml for these two paths
                        #     cases_good.append(pair)
                        # else:
                        #     print '\tNoAvoid: {%f,%f}-notoll->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        #     cases_cannot_avoid_toll.append(pair)
                        #     # cannot avoid toll edge
                        #     print 'cannot avoid toll edge'
                    else:
                        print '\tNoVia: {%f,%f}->{%f,%f}' % (city['lat'], city['lon'], c2['lat'], c2['lon'])
                        cases_do_not_through_toll.append(pair)
        print 'good case:', cases_good
        print 'cannot avoid toll cases:', cases_cannot_avoid_toll
        print 'no toll cases:', cases_do_not_through_toll
        print 'failed cases:', cases_failed
        print 'coverage:', len(commonset), '/', len(cur_tollset), '=', (len(commonset) * 1.0 / len(cur_tollset))
        d = {
            'tollcase' : tollcase,
            'orig2dests': cases_good
        }
        # dump result
        # if len(cases_good) > 0:
        #     cacheutils.store(key, 'cases', jsonutils.dumps(cases_good), 'tollcase')
        # store result to avoid duplicate calculation
        cacheutils.store(key, 'cases', jsonutils.dumps(cases_good), 'tollcase')
        return cases_good


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Avoid Toll case generator', formatter_class=argparse.RawDescriptionHelpFormatter, epilog='''
        TODO, add additional description
        ''')
    # parser.add_argument('-c',
    #     nargs='+',
    #     help='''command to execute\n
    # \tedge : get all toll edges''',
    #     choices=['edge', 'city', 'route', 'toll'],
    #     required=True)
    # parser.add_argument('-c', '--code', choices=['denali_na_my18_stage', 'denali_eu_my18_stage'], required=True, help='production code')
    parser.add_argument('-v', '--version', action='version', version='%(prog)s 1.0')
    # parser.add_argument('-t', '--tollcases', help='file stored toll edge information in json')
    parser.add_argument('-p', '--placeservice', help='PlaceService for search in bounding box', choices=['OverpassPopulationPlaceService', 'OverpassPlaceService'], default='OverpassPopulationPlaceService')
    parser.print_help()
    args = parser.parse_args()
    # print 'production code : %s' % args.code
    print 'args:', args
    # exit(0)

    # 1. get all toll edges (edgeid, lat, lon)
    # if args.tollcases:
    #     cases = getUnfinishedTollEdges(args.tollcases)
    # else:
    #     cases = getTollEdges(cfg['toll_edge_cases_url'])
    f = open('tolls.merge.log')
    cases = []
    g_tollset = set()
    for ln in f.readlines():
        # print ln
        try:
            tc = jsonutils.loads(ln)
            cases.append(tc)
            g_tollset |= set(tc['ids'])
        except ValueError as e:
            continue
    fc = lambda tc : int(tc['fc'])
    cases = sorted(cases, key=fc, reverse=True)
    # print cases
    print 'case length:', len(cases)
    print 'tollset.len:', len(g_tollset)
    time.sleep(3)
    # exit(0)
    
    # 2. get all adjacent cities around each toll
    # case_cities = getAllAdjacentCities(cases, cfg['extension'], cfg['max'])
    # print 
    #print 'case_cities:\n',case_cities
    g_skip_empty_case = True
    tollcases = []
    g = TollCaseGenerator()
    for tc in cases:
        odpair = g.generate(tc)
        tollcases.append({
            'toll_info' : tc,
            'orig2dest' : odpair
        })
    # tollcases = getTollCases(cases, cfg, args.placeservice)
    
    print '===================================='
    for tc in tollcases:
        if len(tc['orig2dest']) == 0:
            print jsonutils.dumps(tc)
    exit(0)
    time.sleep(3)
    g_skip_empty_case = False
    for tc in tollcases:
        if 0 < len(tc['orig2dest']):
            continue
        # use OverpassPlaceService to find orig->dest test case for this toll
        odpair = g.generate(tc['toll_info'], clz=placeservice.OverpassPlaceService)
        print 
        print 'toll:', tc['toll_info']
        print
        print 'odpair:', odpair
        # exit(0)
    exit(0)
    
    # case: 19.90878,-100.45899 -> 20.6231,-103.2795
    # fc5 - 29
    # fc4 - 76
    # fc3 - 34+ 11:40
    # 3. calculate route for each city centers pair then check if the route response passing toll edge, 
    #   calculate route with avoid toll, if route response does not through toll edge (store the cases) 
    #tollcases = getTollCasesWithNearbyCities(case_cities, cfg)
    #print
    #print
    #print 'tollcases:',json.dumps(tollcases, ensure_ascii=False)
    # $ cat log | grep 'tollcases:' | sed 's#tollcases:##' | tee tollcases.json
    
    # 5. calculate route w/o avoid toll option by using google map service
    # https://maps.googleapis.com/maps/api/directions/json?origin=75+9th+Ave+New+York,+NY&destination=MetLife+Stadium+1+MetLife+Stadium+Dr+East+Rutherford,+NJ+07073&key=AIzaSyBkZX3j3eSD0eM0JUU_RA0tjpqQzDLgDaM&avoid=tolls|highways
    # https://developers.google.com/maps/documentation/directions/start
