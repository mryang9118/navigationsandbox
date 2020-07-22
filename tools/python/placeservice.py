#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import random, re, sys, time, urllib
import cacheutils, curlutils, jsonutils, postgre_utils
from places import LatLon


class AbstractPlaceService(object):
    ''' base place service
    '''
    def getCitiesInBoundary(self, lat0, lon0, lat1, lon1, max_candidates, anchor=None):
        ''' get cities in boundary [lat0,lon0->lat1,lon1]
        if we can find number of cities > max_candidates, pick the max_candidates with higher population
        @param lat0: left bottom y position in latitude
        @param lon0: left bottom x position in longitude
        @param lat1: right top y position in latitude
        @param lon1: right top x position in longitude
        @param max_candidates: max number of cities in this boundary
        @param anchor: anchor point. {
            'lat' : lat,
            'lng' : lng
        }
        @return: list of cities. [{
            'id' : city['id'],
            'lat' : city['lat'],
            'lon' : city['lon'],
            'name' : name,
            'population' : getPopulation(city)
        }]
        '''
        raise NotImplementedError
    
    def getCacheKey(self, params):
        ''' get cache key
        @param params: params in dictionary
        @return: key as string
        '''
        params['class'] = self.__class__.__name__
        key = jsonutils.dumps(params)
        print 'cache key:', key
        return key
    
    
    def normalizeLatLon(self, lat, lon):
        ''' normalize latitude and longitude
        @return tuple of (lat, lon)
        '''
        if lat < -90:
            lat = -90
        if lat > 90:
            lat = 90
        if lon < -180:
            lon += 360
        if lon > 180:
            lon -= 180
        return (lat, lon)
    
    
    def moveTop(self, dest, src):
        ''' move src[0] -> dest
        @param dest: list
        @param src: list
        '''
        if 0 == len(src):
            return dest
        city = src[0]
        src.remove(city)
        if not city in dest:
            dest.append(city)
        return dest


    #def getAdjacentCities(case, extension, max_candidates=sys.maxint, clz_placeservice='OverpassPopulationPlaceService'):
    def getNearbyCities(self, lat, lng, extension=1.0, limit=sys.maxint):
        ''' get adjacent cities near (lat, lng)
        @param lat : latitude of the anchor point
        @param lng : longitude of the anchor point
        @param extension : constrant of extension
        @param limit : constrant of number of candidates in return
        @return: cities. [{
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            }]
        '''
        key = self.getCacheKey({
            'lat' : lat,
            'lng' : lng,
            'extension' : extension,
            'limit' : limit
        })
        city_centers = cacheutils.retrieve(key, 'tmp/place')
        if city_centers:
            return jsonutils.loads(city_centers)
        # left top part
        (ltLat, ltLon) = self.normalizeLatLon(lat - extension, lng - extension)
        ltCities = self.getCitiesInBoundary(ltLat, ltLon, lat, lng, limit, anchor={'lat':lat,'lng':lng})
        tmpExtension = extension
        while len(ltCities) == 0:
            print 'expand extension on left top'
            tmpExtension *= 2
            (ltLat1, ltLon1) = self.normalizeLatLon(lat - tmpExtension, lng - tmpExtension)
            if ltLat1 == ltLat and ltLon1 == ltLon:
                print 'WARNING: cannot find nearby [%s] cities on left top part' % latlon
                break
            ltLat = ltLat1
            ltLon = ltLon1
            ltCities = self.getCitiesInBoundary(ltLat, ltLon, lat, lng, limit, anchor={'lat':lat,'lng':lng})
    
        # rigth top part
        (rtLat, rtLon) = self.normalizeLatLon(lat - extension, lng + extension)
        rtCities = self.getCitiesInBoundary(rtLat, lng, lat, rtLon, limit, anchor={'lat':lat,'lng':lng})
        tmpExtension = extension
        while len(rtCities) == 0:
            print 'expand extension on right top'
            tmpExtension *= 2
            (rtLat1, rtLon1) = self.normalizeLatLon(lat - tmpExtension, lng + tmpExtension)
            if rtLat1 == rtLat and rtLon1 == rtLon:
                print 'WARNING: cannot find nearby [%s] cities on right top part' % latlon
                break
            rtLat = rtLat1
            rtLon = rtLon1
            rtCities = self.getCitiesInBoundary(rtLat, lng, lat, rtLon, limit, anchor={'lat':lat,'lng':lng})

        # left bottom part
        (lbLat, lbLon) = self.normalizeLatLon(lat + extension, lng - extension)
        lbCities = self.getCitiesInBoundary(lat, lbLon, lbLat, lng, limit, anchor={'lat':lat,'lng':lng})
        tmpExtension = extension
        while len(lbCities) == 0:
            print 'expand extension on left bottom'
            tmpExtension *= 2
            (lbLat1, lbLon1) = self.normalizeLatLon(lat + tmpExtension, lng - tmpExtension)
            if lbLat1 == lbLat and lbLon1 == lbLon:
                print 'WARNING: cannot find nearby [%s] cities on left bottom part' % latlon
                break
            lbLat = lbLat1
            lbLon = lbLon1
            lbCities = self.getCitiesInBoundary(lat, lbLon, lbLat, lng, limit, anchor={'lat':lat,'lng':lng})
    
        # right bottom
        (rbLat, rbLon) = self.normalizeLatLon(lat + extension, lng + extension)
        rbCities = self.getCitiesInBoundary(lat, lng, rbLat, rbLon, limit, anchor={'lat':lat,'lng':lng})
        tmpExtension = extension
        while len(rbCities) == 0:
            print 'expand extension on right bottom'
            tmpExtension *= 2
            (rbLat1, rbLon1) = self.normalizeLatLon(lat + tmpExtension, lng + tmpExtension)
            if rbLat1 == rbLat and rbLon1 == rbLon:
                print 'WARNING: cannot find nearby [%s] cities on right bottom part' % latlon
                break
            rbLat = rbLat1
            rbLon = rbLon1
            rbCities = self.getCitiesInBoundary(lat, lng, rbLat, rbLon, limit, anchor={'lat':lat,'lng':lng})
    
        city_centers = []
        # add at least one candidate in each region
        print 'left top cities: ', ltCities
        print 'right top cities: ', rtCities
        print 'left bottom cities: ', lbCities
        print 'right bottom cities: ', rbCities
        self.moveTop(city_centers, ltCities)
        self.moveTop(city_centers, rtCities)
        self.moveTop(city_centers, lbCities)
        self.moveTop(city_centers, rbCities)
        # print '4 cities :', city_centers
        while len(city_centers) < limit:
            nextCity = None
            if len(ltCities) > 0:
                nextCity = ltCities[0] 
            if len(rtCities) > 0:
                if nextCity is None:
                    nextCity = rtCities[0]
                else:
                    if nextCity['population'] < rtCities[0]['population']:
                        nextCity = rtCities[0]
            if len(lbCities) > 0:
                if nextCity is None:
                    nextCity = lbCities[0]
                else:
                    if nextCity['population'] < lbCities[0]['population']:
                        nextCity = lbCities[0]
            if len(rbCities) > 0:
                if nextCity is None:
                    nextCity = rbCities[0]
                else:
                    if nextCity['population'] < rbCities[0]['population']:
                        nextCity = rbCities[0]
            if nextCity is None:
                break
            city_centers.append(nextCity)
            if nextCity in ltCities:
                ltCities.remove(nextCity)
            if nextCity in rtCities:
                rtCities.remove(nextCity)
            if nextCity in lbCities:
                lbCities.remove(nextCity)
            if nextCity in rbCities:
                rbCities.remove(nextCity)
        print '\nfind city centers:', city_centers
    
        #dumpAdjacentCitiesKML(wayid, latlon, city_centers)
        cacheutils.store(key, 'tmp/place', jsonutils.dumps(city_centers))
        return city_centers


class OverpassPopulationPlaceService(AbstractPlaceService):
    def getCitiesInBoundary(self, lat0, lon0, lat1, lon1, limit, anchor=None):
        ''' get cities in boundary [lat0,lon0->lat1,lon1]
        if we can find number of cities > limit, pick the limit with higher population
        @param lat0: left bottom y position in latitude
        @param lon0: left bottom x position in longitude
        @param lat1: right top y position in latitude
        @param lon1: right top x position in longitude
        @param limit: max number of cities in this boundary
        @param anchor: anchor point. {
            'lat' : lat,
            'lng' : lng
        }
        @return: list of cities. [{
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            }]
        '''
        # 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
        time.sleep(5)
        # http://overpass-api.de/api/interpreter?data=[out:json];node["place"]["population"](31.59,-116.68,32.59,-115.68);out;
        # in overpass-api, lat0 must < lat1
        if lat0 > lat1:
            tmp = lat0
            lat0 = lat1
            lat1 = tmp
        query = '[out:json];node["place"]["population"](%.2f,%.2f,%.2f,%.2f);out;' % (lat0, lon0, lat1, lon1)
        query = urllib.quote(query)
        cmd = 'curl %s%s' % ('http://overpass-api.de/api/interpreter?data=', query)

        output = curlutils.cachedQuery(cmd, 'tmp/overpass')
        if 'Please check /api/status for the quota of your IP address.' in output or 'The server is probably too busy to handle your request.' in output:
            curlutils.removeCachedQuery(cmd, 'tmp/overpass')
            print 'out of limitation. please wait...'
            exit(0)

        d = jsonutils.loads(output)
        cities = d['elements']

        getPopulation = lambda city : 0 if not 'population' in city['tags'] else city['tags']['population']
        for city in cities:
            population = 0
            try:
                population = str(getPopulation(city)).replace(',', '').replace('~', '').replace('abt', '').replace(' ', '')
                # fix the case : 23209 (INEGI 2010)
                population = re.sub(r'\(.*\)$', '', population)
                population = re.sub(r'people in \d{4}', '', population)
                population = int(population)
            except ValueError:
                strPopulation = getPopulation(city)
                if isinstance(strPopulation, unicode):
                    strPopulation = strPopulation.encode('utf-8')
                print 'ERROR: parsing polution error:%s' % strPopulation
                population = 0
            city['tags']['population'] = population
        print cities
        cities = sorted(cities, key=getPopulation, reverse=True)
        # print cities
        
        city_centers = []
        n = 0
        for city in cities:
            n += 1
            if n > limit:
                break;
            name = 'unknown' if not 'name' in city['tags'] else city['tags']['name'] 
#            if isinstance(name, unicode):
#                name = name.encode('utf-8')
            city_centers.append({
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            })
        # print city_centers
        return city_centers


class OverpassPlaceService(AbstractPlaceService):
    def getCitiesInBoundary(self, lat0, lon0, lat1, lon1, limit, anchor):
        ''' get cities in boundary [lat0,lon0->lat1,lon1]
        if we can find number of cities > limit, random pick limit cities
        @param lat0: left bottom y position in latitude
        @param lon0: left bottom x position in longitude
        @param lat1: right top y position in latitude
        @param lon1: right top x position in longitude
        @param limit: max number of cities in this boundary
        @param anchor: anchor point. {
            'lat' : lat,
            'lng' : lng
        }
        @return: list of cities. [{
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            }]
        '''
        # 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
        time.sleep(5)
        # http://overpass-api.de/api/interpreter?data=[out:json];node["place"](31.59,-116.68,32.59,-115.68);out;
        # in overpass-api, lat0 must < lat1
        if lat0 > lat1:
            tmp = lat0
            lat0 = lat1
            lat1 = tmp
        query = '[out:json];node["place"](%.2f,%.2f,%.2f,%.2f);out;' % (lat0, lon0, lat1, lon1)
        query = urllib.quote(query)
        cmd = 'curl %s%s' % ('http://overpass-api.de/api/interpreter?data=', query)

        output = curlutils.cachedQuery(cmd, 'tmp/overpass')
        if 'Please check /api/status for the quota of your IP address.' in output or 'The server is probably too busy to handle your request.' in output:
            curlutils.removeCachedQuery(cmd, 'tmp/overpass')
            print 'out of limitation. please wait...'
            exit(0)

        d = jsonutils.loads(output)
        cities = d['elements']

        # get population
        getPopulation = lambda city : 0 if not 'population' in city['tags'] else city['tags']['population']
        for city in cities:
            population = 0
            try:
                population = str(getPopulation(city)).replace(',', '').replace('~', '').replace('abt', '').replace(' ', '')
                # fix the case : 23209 (INEGI 2010)
                population = re.sub(r'\(.*\)$', '', population)
                population = re.sub(r'people in \d{4}', '', population)
                population = int(population)
            except ValueError:
                strPopulation = getPopulation(city)
                print 'ERROR: parsing polution error:%s' % strPopulation
                population = 0
            city['tags']['population'] = population
        print cities

        print 'anchor:', anchor
        getManhattanDistance = lambda city : abs(city['lat'] - anchor['lat']) + abs(city['lon'] - anchor['lng'])
        # cities = sorted(cities, key=getPopulation, reverse=True)
        cities = sorted(cities, key=getManhattanDistance)
        print cities
        # TODO, random select at most limit cities
        # if len(cities) > limit:
        #     cities = random.sample(cities, limit)
        #     print
        #     print 'pick:', cities
        
        # exit(0)
        city_centers = []
        n = 0
        for city in cities:
            n += 1
            if n > limit:
                break;
            name = 'unknown' if not 'name' in city['tags'] else city['tags']['name'] 
            city_centers.append({
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            })
        # print city_centers
        return city_centers


class UniDBPlaceService(AbstractPlaceService):
    ''' Place Service for UniDB
    '''
    def getCitiesInBoundary(self, lat0, lon0, lat1, lon1, limit, anchor):
        ''' get cities in boundary [lat0,lon0->lat1,lon1]
        if we can find number of cities > limit, random pick limit cities
        @param lat0: left bottom y position in latitude
        @param lon0: left bottom x position in longitude
        @param lat1: right top y position in latitude
        @param lon1: right top x position in longitude
        @param limit: max number of cities in this boundary
        @param anchor: anchor point. {
            'lat' : lat,
            'lng' : lng
        }
        @return: list of cities. [{
                'id' : city['id'],
                'lat' : city['lat'],
                'lon' : city['lon'],
                'name' : name,
                'population' : getPopulation(city)
            }]
        '''
        if lat0 > lat1:
            tmp = lat0
            lat0 = lat1
            lat1 = tmp
        cmd = 'python postgre_utils.py -c "SELECT *, hstore_to_json(tags) as jtags, ST_AsText(geom) as pt FROM nodes WHERE tags->\'type\'=\'city_center\' AND geom && ST_MakeEnvelope(%f,%f,%f,%f) AND tags ? \'population\';"' % (lon0, lat0, lon1, lat1)
        print cmd
        # TODO
        exit(-5)
        return []


# hide this
# def getCitiesInBoundary(lat0, lon0, lat1, lon1, limit, clz=OverpassPopulationPlaceService):
#     ''' get cities in boundary [lat0,lon0->lat1,lon1]
#     if we can find number of cities > limit, pick the limit with higher population
#     @param lat0: left bottom y position in latitude
#     @param lon0: left bottom x position in longitude
#     @param lat1: right top y position in latitude
#     @param lon1: right top x position in longitude
#     @param limit: max number of cities in this boundary
#     @param clz: class of PlaceService
#     @return: list of cities. [{
#         'id' : city['id'],
#         'lat' : city['lat'],
#         'lon' : city['lon'],
#         'name' : name,
#         'population' : getPopulation(city)
#     }]
#     '''
#     if isinstance(clz, str):
#         clz = eval(clz)
#     ps = clz()
#     return ps.getCitiesInBoundary(lat0, lon0, lat1, lon1, limit)


def getNearbyCities(lat, lng, extension=1.0, limit=sys.maxint, clz=OverpassPopulationPlaceService):
    ''' get adjacent cities near (lat, lng)
    @param lat : latitude of the anchor point
    @param lng : longitude of the anchor point
    @param extension : constrant of extension
    @param limit : constrant of number of candidates in return
    @param clz: class of PlaceService
    @return: cities. [{
            'id' : city['id'],
            'lat' : city['lat'],
            'lon' : city['lon'],
            'name' : name,
            'population' : getPopulation(city)
        }]
    '''
    if isinstance(clz, str):
        clz = eval(clz)
    ps = clz()
    return ps.getNearbyCities(lat, lng, extension, limit)


if __name__ == '__main__':
    # print 'test'
    getNearbyCities(25.98869, -97.45143, clz=UniDBPlaceService)
    
