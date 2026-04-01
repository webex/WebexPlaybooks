#!/usr/bin/env python
"""
export_to_csv.py — Export a UCM database table to CSV via AXL SQL query
========================================================================
Usage: export_to_csv.py [-h] [--host HOST] [--user USER] [--password PASSWORD] table

Positional arguments:
  table              UCM database table name to export (e.g. enduser, device)

Options:
  --host HOST        AXL host (overrides AXL_HOST env var)
  --user USER        AXL user (overrides AXL_USER env var)
  --password PASSWORD  AXL password (overrides AXL_PASSWORD env var)

Output: <table>.csv in the current directory.

UCM data dictionary (table reference):
  https://developer.cisco.com/docs/axl/

SECURITY NOTES:
  - TLS CERTIFICATE VERIFICATION IS DISABLED (verify=False). The connection to UCM
    does not validate the server certificate, making it vulnerable to
    man-in-the-middle attacks. For production use, set verify=True or pass the path
    to your UCM CA certificate bundle.

  - INPUT VALIDATION: The 'table' argument is interpolated directly into an AXL SQL
    query string without allow-list validation. An operator supplying a crafted table
    name could exfiltrate unintended UCM database content. For production use, validate
    the 'table' argument against a known list of UCM table names before executing.
    Example allow-list:
        ALLOWED_TABLES = {'enduser', 'device', 'numplan', 'routeplan'}
        if args.table not in ALLOWED_TABLES:
            sys.exit(f'Error: table "{args.table}" is not in the allowed list.')
"""
import csv
import logging
import os
import sys
from argparse import ArgumentParser

from dotenv import load_dotenv
from ucmaxl import AXLHelper


def main():
    logging.basicConfig(level=logging.INFO)
    logging.getLogger('zeep.wsdl.wsdl').setLevel(logging.INFO)
    logging.getLogger('zeep.xsd.schema').setLevel(logging.INFO)

    parser = ArgumentParser(description='Dump a table from UCM to CSV')
    parser.add_argument('table', type=str,
                        help='table name')
    parser.add_argument('--host', type=str, help='AXl host')
    parser.add_argument('--user', type=str, help='AXL user')
    parser.add_argument('--password', type=str, help='AXL password')
    args = parser.parse_args()

    load_dotenv()
    axl_host = args.host or os.getenv('AXL_HOST')
    axl_user = args.user or os.getenv('AXL_USER')
    axl_pass = args.password or os.getenv('AXL_PASSWORD')
    if not all((axl_pass, axl_host, axl_user)):
        print('AXL host, AXL user, and AXL password all need to be provided either as parameter or in environment '
              '(AXL_HOST, AXL_USER, AXL_PASSWORD)', file=sys.stderr)
        exit(1)

    # SECURITY: verify=False disables TLS certificate verification for the UCM AXL connection.
    # Production deployments must use verify=True or provide a CA bundle path.
    # TODO (production): Add allow-list validation for args.table before passing to sql_query.
    with AXLHelper(ucm_host=axl_host, auth=(axl_user, axl_pass), verify=False) as axl:
        r = axl.sql_query(f'select * from {args.table}')
        csv_name = f'{args.table}.csv'
        with open(csv_name, mode='w', newline='') as output:
            # take keys of 1st record as field names
            writer = csv.DictWriter(output, fieldnames=list(r[0]))
            writer.writeheader()
            list(map(writer.writerow, r))
        print(f'wrote {len(r)} records to {csv_name}')


if __name__ == '__main__':
    main()
