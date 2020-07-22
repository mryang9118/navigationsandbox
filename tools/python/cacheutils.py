#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import md5, os, re


def cachedFilename(key, outdir, prefix='cache'):
    ''' get cache filename for the key
    '''
    fn = md5.new(key).hexdigest()
    if not os.path.exists(outdir) or not os.path.isdir(outdir):
        os.makedirs(outdir)
    fn = os.path.normpath(os.path.join(outdir, '%s_%s' % (prefix, fn)))
    return fn


def store(key, cachedir, data, prefix='cache'):
    ''' store data into file by key
    '''
    fn = cachedFilename(key, cachedir, prefix)
    # remove old value if exist
    lns = []    # previous
    if os.path.isfile(fn):
        f = open(fn)
        find = False
        for ln in f.readlines():
            mo = re.search(r'^{"key":"(.*)"}$', ln)
            if mo:
                if key == mo.groups()[0]:
                    find = True
                else:
                    find = False
            if not find:
                lns.append(ln)
        f.close()
    # write new value
    f = open(fn, 'w')
    if len(lns) > 0:
        for ln in lns:
            f.write(ln)
    f.write('{"key":"%s"}\n' % key)
    f.write(data)
    f.write('\n')
    f.close()


def retrieve(key, cachedir, prefix='cache'):
    ''' retrieve data from cached file by key
    if no cache, return None
    '''
    fn = cachedFilename(key, cachedir, prefix)
    print 'cache filename:', fn
    if not os.path.isfile(fn):
        return None
    f = open(fn)
    find = False
    lns = []
    for ln in f.readlines():
        mo = re.search(r'^{"key":"(.*)"}$', ln)
        if mo:
            if find:
                # already find, we now reach the next key with same md5
                break
            elif key == mo.groups()[0]:
                find = True
            continue
        if find:
            lns.append(ln)
    f.close()
    if find:
        ret = ''.join(lns)
        return ret
    else:
        return None
    return ret


def clean(key, cachedir, prefix='cache'):
    ''' delete cache file 
    '''
    fn = cachedFilename(key, cachedir, prefix)
    if os.path.isfile(fn):
        os.remove(fn)

