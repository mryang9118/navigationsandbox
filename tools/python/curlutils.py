#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import md5, os, re, subprocess, urllib
import cacheutils

def parseurl(cmd):
    print 'cmd:', cmd
    cmd = urllib.unquote(cmd)
    print 'ucmd:', cmd
    # mo = re.search(r'(http[s]://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+)(.*)', cmd)
    mo = re.search(r'(https?://(?:[-.a-zA-Z0-9]+))(?::[0-9a-fA-F]+)?/(.*)', cmd)
    if None != mo:
        print 'len:', len(mo.groups())
        print mo.groups()
        print 'q:', urllib.quote(mo.groups()[1])


def query(cmd):
    ''' run cmd to send query and get response
    '''
    print 'cmd:', urllib.unquote(cmd)
    proc = subprocess.Popen(cmd + ' --compressed', stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    (output, err) = proc.communicate()
    if 0 != proc.returncode:
        # curl return error
        print 'ret = ' + str(proc.returncode)
        print 'output : ' + output
        print 'err : ' + err
        print cmd + ' --compressed'
        exit(0)
    return output


# def cachedQueryFilename(cmd, outdir):
#     ''' get filename for the query [cmd]
#     '''
#     fn = md5.new(cmd).hexdigest()
#     fn = os.path.normpath(os.path.join(outdir, 'cache_%s' % fn))
#     return fn
#
#
def cachedQuery(cmd, outdir):
    ''' if no cache, run http(s) query and store the response to cache
    '''
    # parseurl(cmd)
    plainCmd = urllib.unquote(cmd)
    
    # 1. check if we can find the response in cache or not
    ret = cacheutils.retrieve(plainCmd, outdir)
    if ret:
        return ret
    
    output = query(cmd)
    cacheutils.store(plainCmd, outdir, output)
    
    # print '\noutput:\n',output
    return output


def removeCachedQuery(cmd, outdir):
    ''' remove cache for query : cmd
    '''
    plainCmd = urllib.unquote(cmd)
    cacheutils.clean(plainCmd, outdir)


if __name__ == '__main__':
    parseurl(url)
