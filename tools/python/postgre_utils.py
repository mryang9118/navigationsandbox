#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2017 Telenav, Inc. All rights reserved.


import argparse, os, re, subprocess
import jsonutils


def parse_args():
    ''' parsing command line arguments
    @return {
        'password':'password',
        'user':'user',
        'host':'host',
        'database':'database',
        'command':'command'
    }
    '''
    parser = argparse.ArgumentParser(description='postgre sql command executor', formatter_class=argparse.RawDescriptionHelpFormatter, epilog='''
        e.g. $ python postgre.utils.py -c "SELECT COUNT(*) FROM relations r, relation_members rm WHERE tags->'place' = 'island' AND r.id = rm.relation_id AND member_type = 'W' AND sequence_id = 0;"
        '''
        )
    parser.add_argument('-c', '--command', help='sql command', default='')
    parser.add_argument('-l', help='list database', action='store_true')
    parser.add_argument('-p', '--password', help='password', default='postgres')
    parser.add_argument('-U', '--user', help='user', default='postgres')
    parser.add_argument('-s', '--settings', help='settings', default='default')
    args = parser.parse_args()

    #print args
    if args.l:
        args.command = '-l'

    if 0 == len(args.command):
        print 'empty command, nothing to do'
        parser.print_help()
        exit(0)

    f = open('postgre.config.json')
    s = f.read()
    d = jsonutils.loads(s)
    cfg = d[args.settings]
    return {
        'password' : args.password,
        'user' : args.user,
        'host' : cfg['host'],
        'database' : cfg['database'],
        'command' : args.command,
    }


def execute(args):
    ''' execute psql command
    '''
    if '-l' == args['command']:
        cmd = 'PGPASSWORD=%s psql -U %s -h %s -l' % (args['password'], args['user'], args['host'])
    else:
        sql = args['command'].replace("'", '"')
        cmd = 'PGPASSWORD=%s psql -U %s -h %s -d %s -c "%s"' % (args['password'], args['user'], args['host'], args['database'], args['command'])
    print cmd
    print
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    (output, err) = p.communicate()
    if 0 != p.returncode:
        print 'return code:', p.returncode
        print 'err:', err
        print 'output:', output
        exit(0)
    print output


def getColumns(s):
    ''' get columns from string s
    @param s: string
    @return None if not find
        else list of column
    '''
    ln = s.replace('\n', '')
    mo = re.search(r'([ _A-Za-z0-9]+)(?:\|([ _A-Za-z0-9]+))*$', ln)
    if mo and ln == mo.group():
        mo = re.findall(r'(?:\|? *(\w+) *)', ln)
        return mo
    return None


def parse_sql(fn):
    ''' parsing sql
    @param fn: log file
    '''
    f = open(fn)
    for ln in f.readlines():
        print ln
    # TODO

if __name__ == '__main__':
    # e.g. python postgre.utils.py -c "SELECT COUNT(*) FROM relations r, relation_members rm WHERE tags->'place' = 'island' AND r.id = rm.relation_id AND member_type = 'W' AND sequence_id = 0;"
    args = parse_args()
    print args
    execute(args)
