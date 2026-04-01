"""
UCM AXL Inventory Export for Webex Calling Migration Planning
=============================================================
What this script does:
  1. Connects to Cisco UCM via the AXL SOAP API using the ucmaxl library.
  2. Queries the UCM Informix database (via executeSQLQuery) to retrieve all
     phones with their model, firmware load, device pool, primary directory
     number (DN), and current registration state.
  3. Calls the Webex Calling Numbers API (GET /v1/telephony/config/numbers) to
     retrieve all phone numbers provisioned in the Webex Calling org.
  4. Cross-references each UCM device's primary DN against the Webex Calling
     number list and assigns a migration readiness status:
       MATCH    — the DN maps to a Webex Calling number (migration candidate)
       NO_MATCH — the DN exists in UCM but not yet in Webex Calling
       NO_DN    — the device has no primary line assignment in UCM
  5. Writes the combined report to ucm_device_audit.csv.

What this script does NOT do:
  - It does not modify any data in UCM or Webex Calling (read-only).
  - It does not handle hunt groups, call queues, voicemail, or forwarding rules.
  - It is not production-hardened: no retry logic or structured error handling.
  - TLS certificate verification for UCM is disabled by default. Set
    UCM_VERIFY_TLS=true in .env and pass the CA bundle path to enable it.

Required environment variables (see env.template):
  UCM_HOST            — UCM publisher IP or FQDN
  UCM_USER            — AXL-enabled username
  UCM_PASSWORD        — AXL user password
  WEBEX_ACCESS_TOKEN  — Webex personal access token (developer.webex.com)
"""

import csv
import logging
import os
import sys

import requests
from dotenv import load_dotenv

from ucmaxl import AXLHelper

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

OUTPUT_FILE = "ucm_device_audit.csv"
WEBEX_NUMBERS_URL = "https://webexapis.com/v1/telephony/config/numbers"
WEBEX_PAGE_SIZE = 1000


def get_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        log.error("Required environment variable %s is not set. See env.template.", name)
        sys.exit(1)
    return value


def fetch_ucm_phones(axl: AXLHelper) -> list[dict]:
    """
    Query UCM for all phones (tkclass=1) with model name, firmware load,
    device pool, and primary DN via AXL SQL.
    Returns a list of dicts with keys:
        device_name, description, model, firmware_load, device_pool, primary_dn
    """
    log.info("Querying UCM for phone device inventory...")
    sql = """
        SELECT
            d.name           AS device_name,
            d.description    AS description,
            m.name           AS model,
            d.loadinformation AS firmware_load,
            dp.name          AS device_pool,
            np.dnorpattern   AS primary_dn
        FROM device d
        JOIN typemodel m  ON d.tkmodel = m.enum
        JOIN devicepool dp ON d.fkdevicepool = dp.pkid
        LEFT JOIN devicenumplanmap dnpm
            ON d.pkid = dnpm.fkdevice AND dnpm.numplanindex = 1
        LEFT JOIN numplan np
            ON dnpm.fknumplan = np.pkid
        WHERE d.tkclass = 1
        ORDER BY d.name
    """
    rows = axl.sql_query(sql)
    log.info("Retrieved %d phone records from UCM.", len(rows))
    return rows


def fetch_ucm_registration(axl: AXLHelper) -> dict[str, str]:
    """
    Query UCM for device registration state.
    Returns a dict of {device_name: registration_state}.
    registrationstate values: 1=Registered, 2=Unregistered, others=Unknown
    """
    log.info("Querying UCM for device registration state...")
    sql = """
        SELECT d.name AS device_name,
               rd.registrationstate AS reg_state
        FROM device d
        JOIN registrationdynamic rd ON d.name = rd.devicename
        WHERE d.tkclass = 1
    """
    rows = axl.sql_query(sql)
    state_map = {"1": "Registered", "2": "Unregistered"}
    result = {
        r["device_name"]: state_map.get(str(r.get("reg_state", "")), "Unknown")
        for r in rows
    }
    log.info("Retrieved registration state for %d devices.", len(result))
    return result


def fetch_webex_numbers(token: str) -> set[str]:
    """
    Fetch all phone numbers from the Webex Calling Numbers API (paginated).
    Returns a set of subscriberNumber strings (the local extension portion).
    """
    log.info("Fetching Webex Calling numbers...")
    headers = {"Authorization": f"Bearer {token}"}
    params = {"max": WEBEX_PAGE_SIZE}
    subscriber_numbers: set[str] = set()
    url = WEBEX_NUMBERS_URL

    while url:
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code == 401:
            log.error(
                "Webex API returned 401 Unauthorized. "
                "Check that WEBEX_ACCESS_TOKEN is valid and has not expired."
            )
            sys.exit(1)
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("phoneNumbers", []):
            sub = item.get("subscriberNumber", "")
            if sub:
                subscriber_numbers.add(sub)
            ext = item.get("extension", "")
            if ext:
                subscriber_numbers.add(ext)

        # follow next-page Link header if present
        link_header = resp.headers.get("Link", "")
        url = None
        if 'rel="next"' in link_header:
            for part in link_header.split(","):
                if 'rel="next"' in part:
                    url = part.split(";")[0].strip().strip("<>")
                    break
        params = {}

    log.info("Retrieved %d unique Webex Calling subscriber numbers.", len(subscriber_numbers))
    return subscriber_numbers


def match_dn(dn: str | None, webex_numbers: set[str]) -> str:
    """
    Classify a UCM primary DN against the Webex Calling number set.

    Strategy: compare the raw DN string and also compare the last len(dn) digits
    of each Webex Calling subscriberNumber. Adapt this function if your dial plan
    uses site codes, prefixes, or full E.164 DNs in UCM.
    """
    if not dn:
        return "NO_DN"
    if dn in webex_numbers:
        return "MATCH"
    # try suffix match: e.g. UCM DN "1234" matches Webex subscriberNumber "1234" or "08001234"
    for wxn in webex_numbers:
        if wxn.endswith(dn):
            return "MATCH"
    return "NO_MATCH"


def write_csv(rows: list[dict], output_path: str) -> None:
    fieldnames = [
        "device_name",
        "description",
        "model",
        "firmware_load",
        "device_pool",
        "primary_dn",
        "registration_state",
        "webex_status",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    log.info("Report written to %s (%d rows).", output_path, len(rows))


def main() -> None:
    ucm_host = get_env("UCM_HOST")
    ucm_user = get_env("UCM_USER")
    ucm_password = get_env("UCM_PASSWORD")
    webex_token = get_env("WEBEX_ACCESS_TOKEN")

    verify_tls_str = os.environ.get("UCM_VERIFY_TLS", "false").lower()
    verify_tls = verify_tls_str not in ("false", "0", "no")

    log.info("Connecting to UCM at %s (TLS verify=%s)...", ucm_host, verify_tls)
    axl = AXLHelper(
        ucm_host=ucm_host,
        auth=(ucm_user, ucm_password),
        verify=verify_tls if verify_tls else False,
    )

    phones = fetch_ucm_phones(axl)
    registration = fetch_ucm_registration(axl)
    webex_numbers = fetch_webex_numbers(webex_token)

    log.info("Cross-referencing UCM DNs against Webex Calling numbers...")
    report_rows = []
    for phone in phones:
        device_name = phone.get("device_name", "")
        primary_dn = phone.get("primary_dn")
        report_rows.append(
            {
                "device_name": device_name,
                "description": phone.get("description", ""),
                "model": phone.get("model", ""),
                "firmware_load": phone.get("firmware_load", ""),
                "device_pool": phone.get("device_pool", ""),
                "primary_dn": primary_dn or "",
                "registration_state": registration.get(device_name, "Unknown"),
                "webex_status": match_dn(primary_dn, webex_numbers),
            }
        )

    match_count = sum(1 for r in report_rows if r["webex_status"] == "MATCH")
    no_match_count = sum(1 for r in report_rows if r["webex_status"] == "NO_MATCH")
    no_dn_count = sum(1 for r in report_rows if r["webex_status"] == "NO_DN")

    log.info(
        "Summary — Total: %d | MATCH: %d | NO_MATCH: %d | NO_DN: %d",
        len(report_rows),
        match_count,
        no_match_count,
        no_dn_count,
    )

    write_csv(report_rows, OUTPUT_FILE)


if __name__ == "__main__":
    main()
