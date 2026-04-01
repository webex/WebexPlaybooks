from ucmaxl import AXLHelper
import urllib3

from typing import List
import logging

from ucm_reader.base import *
from ucm_reader.user import *
from ucm_reader.phone import *
from ucm_reader.locations import *

log = logging.getLogger(__name__)


class UCMReader:
    def __init__(self, host: str, user: str, password: str, verify=False):
        # SECURITY: verify=False (the default) disables TLS certificate verification for the
        # AXL SOAP connection to UCM. This leaves the connection vulnerable to man-in-the-middle
        # attacks. For production deployments, pass verify=True or supply the path to your UCM
        # CA certificate bundle (e.g. verify='/path/to/ucm-ca.pem').
        if not verify:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        self._axl = AXLHelper(ucm_host=host, auth=(user, password), verify=verify)
        self.user = UserApi(self._axl.service)
        self.phone = PhoneApi(self._axl.service)
        self.location = LocationApi(self._axl.service)

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
