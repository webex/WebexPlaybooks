#!/usr/bin/env python
"""
Stage 1 of the UCM-to-Webex Calling dial plan migration pipeline.

WHAT THIS SCRIPT DOES:
  Connects to Cisco UCM via the Thin AXL SOAP API and reads all ILS-learned dial
  patterns from the remoteroutingpattern table. Output is written to read_ucm.csv
  with two columns: remotecatalogkey_id (the UCM routestring) and pattern.

WHAT IT DOES NOT DO:
  - Does not migrate route patterns, translation patterns, or other UCM objects.
  - Does not provision anything in Webex Calling.

REQUIRED ENVIRONMENT VARIABLES (set in .env or environment):
  AXL_HOST     - UCM hostname or IP address (e.g. ucm.example.com or 10.0.0.1)
  AXL_USER     - UCM account with Standard AXL API Access role
  AXL_PASSWORD - Password for AXL_USER

SECURITY NOTE:
  This script calls AXLHelper with verify=False, which disables TLS certificate
  validation for the UCM AXL endpoint. This is acceptable in isolated lab environments
  but is a security risk in production. To enable certificate verification, change the
  verify parameter below to the path of your UCM CA certificate bundle, e.g.:
    axl = AXLHelper(ucm_host=axl_host, auth=(axl_user, axl_password), verify='/path/to/ca.pem')
  Never set verify=False when connecting over an untrusted network.
"""
import csv
import logging
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field, parse_obj_as

from ucmaxl import AXLHelper


class LearnedPattern(BaseModel):
    remote_catalog_key_id: str = Field(alias='remotecatalogkey_id')
    pattern: str


def learned_patterns(axl: AXLHelper, with_numbers: bool = False) -> list[LearnedPattern]:
    """
    Read learned patterns from remoteroutingpattern table.

    tkpatternusage values used:
      23 ILS Learned Enterprise Number
      24 ILS Learned E164 Number
      25 ILS Learned Enterprise Numeric Pattern
      26 ILS Learned E164 Numeric Pattern
      30 ILS Imported E164 Number

    :param axl: AXLHelper instance
    :param with_numbers: if True, also include exact number entries (23, 24)
    :return: list of LearnedPattern
    """
    usage = [25, 26]
    if with_numbers:
        usage.extend((23, 24, 25))
    usage = f'({",".join(str(u) for u in usage)})'
    patterns = axl.sql_query(
        f'select remotecatalogkey_id,pattern from remoteroutingpattern where tkpatternusage in {usage}')
    return parse_obj_as(list[LearnedPattern], patterns)


class RemoteCatalog(BaseModel):
    peer_id: str = Field(alias='peerid')
    route_string: str = Field(alias='routestring')


class RcKey(BaseModel):
    rc_key_id: str = Field(alias='remotecatalogkey_id')
    rc_catalog_peer_id: str = Field(alias='remoteclusteruricatalog_peerid')


def read_from_ucm():
    """
    Read learned patterns from UCM using thin AXL.
    Output is written to read_ucm.csv for further processing.
    """
    axl_host = os.getenv('AXL_HOST')
    axl_user = os.getenv('AXL_USER')
    axl_password = os.getenv('AXL_PASSWORD')
    if not all((axl_host, axl_user, axl_password)):
        raise KeyError(
            'Environment variables AXL_HOST, AXL_USER, and AXL_PASSWORD '
            'must be set or defined in a .env file.'
        )

    print('Reading from UCM...')

    # SECURITY NOTE: verify=False disables TLS certificate validation.
    # Replace with verify='/path/to/ca-bundle.pem' in production environments.
    axl = AXLHelper(ucm_host=axl_host, auth=(axl_user, axl_password), verify=False)

    remote_catalogs = parse_obj_as(list[RemoteCatalog],
                                   axl.sql_query('select peerid,routestring from remoteclusteruricatalog'))
    rc_by_peer_id: dict[str, RemoteCatalog] = {rc.peer_id: rc for rc in remote_catalogs}

    rc_keys = parse_obj_as(
        list[RcKey],
        axl.sql_query('select remotecatalogkey_id,remoteclusteruricatalog_peerid from remotecatalogkey'))
    route_string_by_catalog_key: dict[str, str] = {
        rc.rc_key_id: rc_by_peer_id[rc.rc_catalog_peer_id].route_string
        for rc in rc_keys
    }

    learned = learned_patterns(axl)

    csv_path = f'{os.path.splitext(os.path.basename(__file__))[0]}.csv'
    print(f'Writing patterns to "{csv_path}"')
    with open(csv_path, mode='w', newline='') as output:
        writer = csv.writer(output)
        writer.writerow(('remotecatalogkey_id', 'pattern'))
        for pattern in learned:
            writer.writerow((route_string_by_catalog_key[pattern.remote_catalog_key_id], pattern.pattern))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    logging.getLogger('zeep.wsdl.wsdl').setLevel(logging.INFO)
    logging.getLogger('zeep.xsd.schema').setLevel(logging.INFO)
    load_dotenv()
    read_from_ucm()
