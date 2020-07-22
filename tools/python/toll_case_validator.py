#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.

import os
import jsonutils, mapservice
from places import LatLon

class TollCaseValidator(object):
    def __init__(self):
        self.ms = mapservice.MapService()
        self.googlems = mapservice.GoogleMapService()

    def validate(self, orig, dest):
        ''' validate route calculation with google map service
        @param orig: start point in format {
            'lat' : lat
            'lng' : lng
        }
        @param dest: end point in format {
            'lat' : lat
            'lng' : lng
        }
        '''
        p0 = LatLon(orig['lat'], orig['lon'])
        p1 = LatLon(dest['lat'], dest['lon'])
        
        # Telenav
        tn_toll_route = self.ms.parseDirectionsResponse(self.ms.directions(p0, p1, useCache=False))
        tn_no_toll_route = self.ms.parseDirectionsResponse(self.ms.directions(p0, p1, True, useCache=False))
        #print 'status:', tn_no_toll_route.status
        print 'distance(avoidtoll[tn]):', tn_no_toll_route.distance
        #print 'time:', tn_no_toll_route.travel_time
        #print
        #print 'json:', tn_no_toll_route.rawdata
        
        # Google
        g_toll_route = self.googlems.parseDirectionsResponse(self.googlems.directions(p0, p1))
        g_no_toll_route = self.googlems.parseDirectionsResponse(self.googlems.directions(p0, p1, True))
        #print 'status:', g_no_toll_route.status
        print 'distance(avoidtoll[google]):', g_no_toll_route.distance
        #print 'time:', g_no_toll_route.travel_time
        #print
        #print 'json:', g_no_toll_route.rawdata
        print 'd(t)/d(g):', float(tn_no_toll_route.distance) / g_no_toll_route.distance
        # d = orig2dest
        d = {
            'orig': orig,
            'dest': dest
        }
        d['telenav_distance_notoll'] = tn_no_toll_route.distance
        d['google_distance_notoll'] = g_no_toll_route.distance
        d['ratio_notoll'] = float(tn_no_toll_route.distance) / g_no_toll_route.distance
        d['ratio_telenav'] = float(tn_no_toll_route.distance) / tn_toll_route.distance
        d['ratio_google'] = float(g_no_toll_route.distance) / g_toll_route.distance
        d['ratio_t2g'] = d['ratio_telenav'] / d['ratio_google']
        print 'avoid toll compare result:', jsonutils.dumps(d)
        return d

def mergeTollCases():
    cases_path = os.path.normpath('cases')
    print 'cases_path:', cases_path
    tollcases = [ x for x in os.listdir(cases_path) if x.startswith('tollcase_') ]
    # for (dirpath, dirnames, filenames) in os.walk(cases_path):
    #     pass
    # print 'tollcases:', tollcases
    # print 'len:', len(tollcases)
    
    ods = []
    n = 0
    dups = 0
    for case in tollcases:
        fp = os.path.join(cases_path, case)
        # print
        # print fp
        # print
        f = open(fp)
        c = f.read()
        # print c
        lns = c.splitlines()
        assert(2 == len(lns));
        toll_info = lns[0]
        odpairs = lns[1]
        # print 'toll_info:', toll_info
        # print
        # print 'odpairs:', odpairs
        
        # parse json -> list
        odpairs = jsonutils.loads(odpairs)
        n += len(odpairs)
        # print 'odpairs:', odpairs
        for p in odpairs:
            # # dict is not hashable, we use json representation as key
            # k = jsonutils.dumps(p)
            # # print 'pair:', k
            # if k in odpairset:
            #     dups += 1
            # odpairset.add(k)
            if p in ods:
                dups += 1
                continue
            ods.append(p)
        # exit(0)
    # print 'n:', n
    # print 'dups:', dups
    print 'len(ods):', len(ods)
    # exit(0)
    return ods
    
if __name__ == '__main__':
    print 'toll case validator'
    odpairs = mergeTollCases()
    v = TollCaseValidator()
    for p in odpairs:
        orig = p['orig']
        dest = p['dest']
        print '%s -> %s' % (jsonutils.dumps(orig), jsonutils.dumps(dest))
        v.validate(orig, dest)
