#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


class LatLon(object):
    ''' latitude, longtitude representation of a place '''
    def __init__(self, lat, lon):
        self.lat = float(lat)
        self.lon = float(lon)
    
    
    def __repr__(self):
        return '%.6f,%.6f' % (self.lat, self.lon)
    
    
    def __eq__(self, other):
        """Override the default Equals behavior"""
        if isinstance(other, self.__class__):
            return repr(self) == repr(other)
            # return self.__dict__ == other.__dict__
        return False
    
    
    def __ne__(self, other):
        """Define a non-equality test"""
        return not self.__eq__(other)


    @staticmethod
    def decode(str):
        ss = str.split(',')
        if 2 != len(ss):
            print 'ERROR: parsing latlon error for %s' % str
            exit(1)
        return LatLon(ss[0], ss[1])


if __name__ == '__main__':
    ll = LatLon(37.37296151, -121.92922)
    print ll
    print ll.__dict__