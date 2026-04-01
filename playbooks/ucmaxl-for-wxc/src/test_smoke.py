"""
Smoke test for main.py — runs without real UCM or Webex credentials.

Mocks:
  - ucmaxl.AXLHelper  (no SOAP connection to UCM)
  - requests.get      (no HTTP call to Webex API)

Covers the three DN classification paths:
  MATCH    — UCM DN found in Webex Calling numbers
  NO_MATCH — UCM DN not found in Webex Calling
  NO_DN    — Device has no primary line assignment

Run with:
  python -m unittest test_smoke -v
  # or, if pytest is installed:
  python -m pytest test_smoke.py -v
"""

import csv
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure src/ is on the path when running directly
sys.path.insert(0, os.path.dirname(__file__))

# ucmaxl/__init__.py imports zeep (and other SOAP libs) at the module level.
# Stub the entire ucmaxl and zeep packages in sys.modules BEFORE main.py is
# imported so the import chain never tries to load the real libraries.
_ucmaxl_stub = MagicMock()


class SmokeMockAXLHelper:
    """Minimal AXLHelper stand-in; injected via sys.modules stub."""

    def __init__(self, ucm_host, auth, verify=False, **kwargs):
        pass

    def sql_query(self, sql):
        sql_stripped = sql.strip().lower()
        if "registrationdynamic" in sql_stripped:
            return FAKE_REGISTRATION
        return FAKE_PHONES

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


_ucmaxl_stub.AXLHelper = SmokeMockAXLHelper

for _mod in ("ucmaxl", "zeep", "zeep.cache", "zeep.exceptions",
             "zeep.helpers", "zeep.plugins"):
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

sys.modules["ucmaxl"].AXLHelper = SmokeMockAXLHelper


import main  # noqa: E402 — must come after sys.modules stubs above

FAKE_PHONES = [
    {
        "device_name": "SEP001122334455",
        "description": "Alice desk phone",
        "model": "Cisco 8841",
        "firmware_load": "sip88xx.14-1-1SR1-1",
        "device_pool": "SJC_DP",
        "primary_dn": "1001",
    },
    {
        "device_name": "SEP00AABBCCDDEE",
        "description": "Bob desk phone",
        "model": "Cisco 7841",
        "firmware_load": "SCCP41.9-4-2SR3-1",
        "device_pool": "SJC_DP",
        "primary_dn": "9999",
    },
    {
        "device_name": "SEP00FFEEDDCCBB",
        "description": "Lobby phone",
        "model": "Cisco 7811",
        "firmware_load": "SCCP41.9-4-2SR3-1",
        "device_pool": "LOBBY_DP",
        "primary_dn": None,
    },
]

FAKE_REGISTRATION = [
    {"device_name": "SEP001122334455", "reg_state": "1"},
    {"device_name": "SEP00AABBCCDDEE", "reg_state": "2"},
    {"device_name": "SEP00FFEEDDCCBB", "reg_state": "1"},
]

FAKE_WEBEX_RESPONSE = {
    "phoneNumbers": [
        {"subscriberNumber": "1001", "extension": "1001"},
        {"subscriberNumber": "2002", "extension": "2002"},
    ]
}


def make_mock_requests_get(payload):
    """Return a mock requests.get that returns payload once, then no more pages."""

    def mock_get(url, headers=None, params=None, timeout=30):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = payload
        resp.headers = {}
        resp.raise_for_status = MagicMock()
        return resp

    return mock_get


class TestSmoke(unittest.TestCase):

    def _run_main_with_mocks(self, tmp_path):
        env = {
            "UCM_HOST": "ucm.test.local",
            "UCM_USER": "axluser",
            "UCM_PASSWORD": "axlpass",
            "WEBEX_ACCESS_TOKEN": "fake-token",
        }
        output_csv = os.path.join(tmp_path, "ucm_device_audit.csv")

        with patch.dict(os.environ, env, clear=False), \
             patch("main.AXLHelper", SmokeMockAXLHelper), \
             patch("main.requests.get", make_mock_requests_get(FAKE_WEBEX_RESPONSE)), \
             patch("main.OUTPUT_FILE", output_csv):
            main.main()

        return output_csv

    def test_csv_is_created(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            self.assertTrue(os.path.isfile(csv_path), "ucm_device_audit.csv was not created")

    def test_csv_headers(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames
            expected = [
                "device_name", "description", "model", "firmware_load",
                "device_pool", "primary_dn", "registration_state", "webex_status",
            ]
            self.assertEqual(headers, expected)

    def test_csv_row_count(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(len(rows), 3, "Expected 3 device rows in CSV")

    def test_match_status(self):
        """SEP001 has DN 1001 which is in the Webex Calling mock → MATCH."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = {r["device_name"]: r for r in csv.DictReader(f)}
        self.assertEqual(rows["SEP001122334455"]["webex_status"], "MATCH")

    def test_no_match_status(self):
        """SEP002 has DN 9999 which is NOT in the Webex Calling mock → NO_MATCH."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = {r["device_name"]: r for r in csv.DictReader(f)}
        self.assertEqual(rows["SEP00AABBCCDDEE"]["webex_status"], "NO_MATCH")

    def test_no_dn_status(self):
        """SEP003 has no primary DN → NO_DN."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = {r["device_name"]: r for r in csv.DictReader(f)}
        self.assertEqual(rows["SEP00FFEEDDCCBB"]["webex_status"], "NO_DN")

    def test_registration_state(self):
        """SEP001 reg_state=1 → Registered; SEP002 reg_state=2 → Unregistered."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = self._run_main_with_mocks(tmp)
            with open(csv_path, newline="", encoding="utf-8") as f:
                rows = {r["device_name"]: r for r in csv.DictReader(f)}
        self.assertEqual(rows["SEP001122334455"]["registration_state"], "Registered")
        self.assertEqual(rows["SEP00AABBCCDDEE"]["registration_state"], "Unregistered")

    def test_match_dn_unit(self):
        """Unit test for match_dn() directly."""
        webex_nums = {"1001", "2002", "+14085551234"}
        self.assertEqual(main.match_dn("1001", webex_nums), "MATCH")
        self.assertEqual(main.match_dn("1234", webex_nums), "MATCH")   # suffix match on +14085551234
        self.assertEqual(main.match_dn("9999", webex_nums), "NO_MATCH")
        self.assertEqual(main.match_dn(None, webex_nums), "NO_DN")
        self.assertEqual(main.match_dn("", webex_nums), "NO_DN")


if __name__ == "__main__":
    unittest.main()
