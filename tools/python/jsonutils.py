#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import json


# reference : http://stackoverflow.com/questions/956867/how-to-get-string-objects-instead-of-unicode-ones-from-json-in-python
def _byteify(data, ignore_dicts = False):
    # if this is unicode string, return its utf-8 representation
    if isinstance(data, unicode):
        return data.encode('utf-8')
    # if this is a list of values, return list of byteified values
    if isinstance(data, list):
        return [ _byteify(item, ignore_dicts=True) for item in data ]
    # if this is a dictionary, return dictionary of byteified keys and values
    # but only if we haven't already byteified it
    if isinstance(data, dict) and not ignore_dicts:
        return {
            _byteify(key, ignore_dicts=True): _byteify(value, ignore_dicts=True) for key, value in data.iteritems()
        }
    # if it's anything else, return it in its original form
    return data


class jsonutils(object):
    def loads(self, str):
        ''' loads json string and convert unicode -> utf-8
        @return dictionary or list
        '''
        return _byteify(
                json.loads(str, object_hook=_byteify),
                ignore_dicts = True
                )
    
    def dumps(self, data):
        ''' get json representation for the data
        @param data: data to serielize
        @return: json representation
        '''
        return json.dumps(data, ensure_ascii=False)


def loads(str):
    ''' loads json string and convert unicode -> utf-8
    @return dictionary or list
    '''
    return jsonutils().loads(str)


def dumps(data):
    ''' get json representation for the data
    @param data: data to serielize
    @return: json representation
    '''
    return jsonutils().dumps(data)


if __name__ == '__main__':
    od = {'lat':12.345,'lon':-24.22,'wayid':'abc'}
    js = json.dumps(od, ensure_ascii=False)
    print js
    d = loads(js)
    print d
    print json.loads(js)
    f = open('cases/3_tollcase_771923017100.json')
    s = f.read()
    print 's:', s
    print loads(s)
