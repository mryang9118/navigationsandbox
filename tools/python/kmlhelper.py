#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.

# reference : https://developers.google.com/kml/documentation/kml_tut
# api: https://developers.google.com/kml/documentation/kmlreference
# online kml viewer : http://display-kml.appspot.com/
# helpful : http://dagik.org/kml_intro/E/point.html
#       http://dagik.org/kml_intro/E/line.html

# alternatives  : https://pythonhosted.org/pykml/tutorial.html
#               : https://pypi.python.org/pypi/simplekml/

import sys
from places import *

def header():
    ''' kml header
    '''
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        '<Document>\n'
       )

def footer():
    ''' kml footer
    '''
    return ('</Document>\n'
       '</kml>\n')

def supportStyles():
    ''' get all supported styles
    '''
    return {
        'toll' : 'http://api.tollsmart.com/images/120px-Toll_booth.svg.png',
        'via' : 'http://www.iconninja.com/files/66/5/234/saline-icon.png',
        'guidance_point' : 'https://image.flaticon.com/icons/png/128/83/83716.png'
        }

def styleheader(styles):
    ''' generate kml style header
    '''
    ret = ''
    ss = supportStyles()
    for style in styles:
        if style is None:
            continue
        if style in ss.keys():
            ret = ('%s'
            '<Style id="%s">\n'
            '<IconStyle>\n'
            '<Icon>\n'
            '<href>%s</href>\n'
            '</Icon>\n'
            '</IconStyle>\n'
            '</Style>\n'
            ) % (ret, style, ss[style])
        else:
            print 'ERROR: unsupported style [%s]!!!' % style
    return ret

def point2Placemark(point):
    '''generate Placemark for this point
    point is dictionary of {'name':name,'lat':lat,'lon':lon,'style':'style'}
    '''
    if 'style' in point and point['style']:
        return ('<Placemark>\n'
           '<name>%s</name>\n'
           '<styleUrl>#%s</styleUrl>\n'
           '<Point>\n'
           '<coordinates>%.6f,%.6f</coordinates>\n'
           '</Point>\n'
           '</Placemark>\n'
           ) % (point['name'], point['style'], point['lon'], point['lat'])
    else:
        return ('<Placemark>\n'
           '<name>%s</name>\n'
           '<Point>\n'
           '<coordinates>%.6f,%.6f</coordinates>\n'
           '</Point>\n'
           '</Placemark>\n'
           ) % (point['name'], point['lon'], point['lat'])

def point2kml(point):
    ''' generate kml for this point
    point is dictionary of {'name':name,'lat':lat,'lon':lon,'style':'style'}
    '''
    styles = []
    if 'style' in point:
        styles.append(point['style'])
    kml = '%s%s%s%s' % (header(), styleheader(styles), point2Placemark(point), footer())
    # print 'Content-Type: application/vnd.google-earth.kml+xml\n'
    return kml

def points2kml(points):
    ''' generate kml for this point list
    points contains list of {'name':name,'lat':lat,'lon':lon,'style':'style'}
    '''
    # print '\npoints:', points
    styles = []
    for point in points:
        if 'style' in point:
            style = point['style']
            if not style in styles:
                styles.append(style)
    kml = '%s%s' % (header(), styleheader(styles))
    for p in points:
        kml = '%s%s' % (kml, point2Placemark(p))
    kml = '%s%s' % (kml, footer())
    # print '\nkml:', kml
    return kml

def polygon2Placemark(polygon):
    '''generate Placemark for this polygon
    point is dictionary of {'name':name,'points':[{'lat':lat,'lon':lon}...]}
    '''
    kml = (
        '<Placemark>\n'
            '<name>%s</name>\n'
            '<Polygon>\n'
              '<outerBoundaryIs>\n'
                '<LinearRing>\n'
                  '<coordinates>\n'
        ) % polygon['name']
    for point in polygon['points']:
        kml = ('%s'
            '%.6f,%.6f\n'
            ) % (kml, point['lon'], point['lat'])
    kml = ('%s'
                  '</coordinates>\n'
                '</LinearRing>\n'
              '</outerBoundaryIs>\n'
            '</Polygon>\n'
          '</Placemark>\n'
        ) % kml
    return kml


def boundingbox2kml(name, lat0, lon0, lat1, lon1):
    '''generate kml for this bounding box
    '''
    polygon = {
        'name' : name,
        'points' : [
            {'lat':lat0, 'lon':lon0},
            {'lat':lat1, 'lon':lon0},
            {'lat':lat1, 'lon':lon1},
            {'lat':lat0, 'lon':lon1},
        ]
    }
    kml = '%s%s%s' % (header(), polygon2Placemark(polygon), footer())
    return kml


def polygon2kml(polygon):
    '''generate kml for this polygon
    point is dictionary of {'name':name,'points':[{'lat':lat,'lon':lon}...]}
    '''
    kml = '%s%s%s' % (header(), polygon2Placemark(polygon), footer())
    return kml


def path2Placemark(path):
    '''generate Placemark for this path
    point is dictionary of {'name':name,'points':[{'lat':lat,'lon':lon}...]}
    '''
    kml = (
        '<Placemark>\n'
        '<name>%s</name>\n'
        '<LineString>\n'
        '<coordinates>\n'
        ) % path['name']
    for point in path['points']:
        kml = ('%s'
            '%.6f,%.6f\n'
            ) % (kml, point['lon'], point['lat'])
    kml = ('%s'
        '</coordinates>\n'
        '</LineString>\n'
        '</Placemark>\n'
        ) % kml
    return kml


def path2kml(path):
    '''generate kml for this path
    point is dictionary of {'name':name,'points':[{'lat':lat,'lon':lon}...]}
    '''
    kml = '%s%s%s' % (header(), path2Placemark(path), footer())
    return kml


def style4Placemark(placemark):
    ''' get style for this placemark
    '''
    if hasattr(placemark, 'style'):
        return placemark.style
    return None


def styles4Placemarks(placemarks):
    ''' get style for the list of placemarks
    '''
    styles = []
    for placemark in placemarks:
        style = style4Placemark(placemark)
        if style:
            styles.append(style)
    s = set(styles)
    return list(s)


def placemark2kml(placemark):
    ''' generate kml for this placemark
    '''
    if placemark is None:
        return ''
    kml = '%s%s%s%s' % (header(), styleheader([style4Placemark(placemark)]), placemark.toPlacemark(), footer())
    return kml


def placemarks2kml(placemarks):
    ''' generate kml for thi placemark list
    '''
    if placemarks is None:
        return ''
    kml = '%s%s' % (header(), styleheader(styles4Placemarks(placemarks)))
    for placemark in placemarks:
        kml = '%s%s' % (kml, placemark.toPlacemark())
    kml = '%s%s' % (kml, footer())
    return kml


class KMLPlacemark(object):
    def __init__(self, name, kmltype=None):
        ''' construct KMLPoint
        @param name : Placemark name
        @param kmltype : type of Placemark
        '''
        self.name = name
        self.kmltype = kmltype


class KMLPoint(KMLPlacemark):
    def __init__(self, name, latlon, style=None):
        ''' construct KMLPoint
        @param name : Placemark name
        @param latlon : object of LatLon
        @param style : style
        '''
        super(KMLPoint, self).__init__(name, 'Point')
        self.lat = latlon.lat
        self.lon = latlon.lon
        self.style = style
    
        
    def toPlacemark(self):
        return point2Placemark(self.__dict__)


class KMLPolygon(KMLPlacemark):
    def __init__(self, name, latlons):
        ''' construct KMLPolygon
        @param name : Placemark name
        @param latlon : list of LatLon
        '''
        if len(latlons) < 3:
            print 'ERROR: @%s not enough points for construct a polygon' % (sys._getframe().f_code.co_name)
            return None
        super(KMLPolygon, self).__init__(name, 'Polygon')
        self.points = map(lambda latlon: latlon.__dict__, latlons)
    
    def toPlacemark(self):
        return polygon2Placemark(self.__dict__)


class KMLPath(KMLPlacemark):
    def __init__(self, name, latlons, close=False):
        ''' construct KMLPath
        @param name : Placemark name
        @param latlon : list of LatLon
        @param close : flag to indicate whether this is a close loop or not
        '''
        if len(latlons) < 2:
            print 'ERROR: @%s not enough points for construct a path' % (sys._getframe().f_code.co_name)
            return None
        super(KMLPath, self).__init__(name, 'Path')
        self.points = map(lambda latlon: latlon.__dict__, latlons)
        if close:
            self.points.append(self.points[0])
    
    def toPlacemark(self):
        return path2Placemark(self.__dict__)

if __name__ == '__main__':
    # http://www.hillandsmith.com/wp-content/uploads/2016/04/toll-roads-1.png
    # Test 1: point2kml
    print '------ point ------'
    kml = point2kml({'name':'point', 'lat':32.593790, 'lon':-115.682160})
    print kml
    print
    
    # Test 2: point2kml with style
    print '------ point with style ------'
    kml = point2kml({'name':'point', 'lat':32.593790, 'lon':-115.682160, 'style':'toll'})
    print kml
    print
    
    # Test 3: points2kml
    print '------ points ------'
    points = [{'lat': 32.59379, 'style': 'toll', 'lon': -115.68216, 'name': '771923017100'}, {'lat': 32.6200699, 'lon': -115.4440698, 'name': 'Mexicali'}, {'lat': 32.792, 'lon': -115.5630514, 'name': 'El Centro'}, {'lat': 32.6790572, 'lon': -115.498703, 'name': 'Calexico'}, {'lat': 32.9786566, 'lon': -115.530267, 'name': 'Brawley'}, {'lat': 32.8475529, 'lon': -115.5694391, 'name': 'Imperial'}, {'lat': 32.3552462, 'lon': -115.189983, 'name': 'Ciudad Estaci\xc3\xb3n Delta'}, {'lat': 32.8104966, 'lon': -115.3794264, 'name': 'Holtville'}, {'lat': 32.4674395, 'lon': -115.3083795, 'name': 'Ejido Michoacan De Ocampo'}, {'lat': 32.4124003, 'lon': -115.1890024, 'name': 'Ejido Nuevo Le\xc3\xb3n'}, {'lat': 33.0372674, 'lon': -115.6213817, 'name': 'Westmorland'}]
    kml = points2kml(points)
    print kml
    print
    
    # Test 4: boundingbox2kml
    print '------ boundingbox ------'
    kml = boundingbox2kml('test', 32.09,-116.18,33.09,-115.18)
    print kml
    print
    
    # Test 5: KMLPoint
    print '------ KMLPoint ------'
    p = KMLPoint('name', LatLon(32.09, -116.18))
    kml = placemark2kml(p)
    print kml
    print
    
    print '------ KMLPoint with style ------'
    p = KMLPoint('name-111', LatLon(32.593790, -115.682160), 'toll')
    print p.__dict__
    places = [p]
    kml = placemark2kml(p)
    print kml
    print 
    
    # Test 6: KMLPolygon
    print '------ KMLPolygon ------'
    p = KMLPolygon('name', [LatLon(32.09, -116.18), LatLon(33.09, -116.18), LatLon(33.09, -115.18), LatLon(32.09, -115.18)])
    print p.__dict__
    kml = placemark2kml(p)
    print kml
    print
    
    # Test 7: KMLPath
    print '------ KMLPath ------'
    p = KMLPath('path', [LatLon(32.09, -116.18), LatLon(33.09, -116.18), LatLon(33.09, -115.18), LatLon(32.09, -115.18)])
    print p.__dict__
    kml = placemark2kml(p)
    print kml
    print 
    
    print '------ KMLPath (closed) ------'
    p = KMLPath('path', [LatLon(32.09, -116.18), LatLon(33.09, -116.18), LatLon(33.09, -115.18), LatLon(32.09, -115.18)], True)
    places.append(p)
    kml = placemark2kml(p)
    print kml
    print
    
    kml = placemarks2kml(places)
    print '------ Placemarks ------'
    print kml
    print
    
