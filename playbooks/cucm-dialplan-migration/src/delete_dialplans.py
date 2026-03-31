#!/usr/bin/env python
"""
Utility: Delete all dial plans referenced in config.yml from Webex Calling.

WHAT THIS SCRIPT DOES:
  Reads the list of dial plan names from config.yml and deletes each matching
  dial plan from Webex Calling using the wxc-sdk. Only deletes dial plans that
  actually exist — missing dial plans are silently skipped.

WHAT IT DOES NOT DO:
  - Does not delete Trunks or Route Groups.
  - Does not modify config.yml after deletion.

REQUIRED ENVIRONMENT VARIABLES (set via .env or environment):
  TOKEN_INTEGRATION_CLIENT_ID      - Webex OAuth integration client ID
  TOKEN_INTEGRATION_CLIENT_SECRET  - Webex OAuth integration client secret
  TOKEN_INTEGRATION_CLIENT_SCOPES  - Space-separated OAuth scopes

USAGE:
  python delete_dialplans.py
"""
import asyncio
import logging

from wxc_sdk.as_api import AsWebexSimpleApi

from config import Config

log = logging.getLogger(__name__)


async def delete_dialplans():
    """Delete dial plans listed in config.yml from Webex Calling."""
    config = Config.from_yml('config.yml')
    async with AsWebexSimpleApi(tokens=config.tokens.access_token) as api:
        dp_api = api.telephony.prem_pstn.dial_plan
        dialplans = {dp.name: dp for dp in await dp_api.list()}

        tasks = [dp_api.delete_dial_plan(dial_plan_id=wxc_dp.dial_plan_id)
                 for dialplan in config.dialplans
                 if (wxc_dp := dialplans.get(dialplan.name))]
        if tasks:
            await asyncio.gather(*tasks)
            log.info(f'deleted {len(tasks)} dial plans')
        else:
            log.info('no matching dial plans found to delete')


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    asyncio.run(delete_dialplans())
