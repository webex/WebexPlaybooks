#!/usr/bin/env python
"""
Stage 3 of the UCM-to-Webex Calling dial plan migration pipeline.

WHAT THIS SCRIPT DOES:
  Reads normalized patterns from the CSV file produced by normalize.py and the
  dial plan mapping from config.yml. Authenticates with Webex Calling via OAuth
  (managed by wxc-sdk), then idempotently creates or updates dial plans and their
  pattern assignments using the Webex Calling Premises PSTN API.

  The script runs in two passes to avoid pattern conflicts when catalogs move
  between dial plans: first it deletes obsolete patterns, then adds new ones.

WHAT IT DOES NOT DO:
  - Does not create Trunks or Route Groups — these must exist in Webex Calling first.
  - Does not validate Webex Calling rate limits; large pattern sets may trigger 429s.
  - Is not production-hardened; minimal error handling is provided.

REQUIRED ENVIRONMENT VARIABLES (set via .env or environment):
  TOKEN_INTEGRATION_CLIENT_ID      - Webex OAuth integration client ID
  TOKEN_INTEGRATION_CLIENT_SECRET  - Webex OAuth integration client secret
  TOKEN_INTEGRATION_CLIENT_SCOPES  - Space-separated OAuth scopes

USAGE:
  python configure_wxc.py normalized.csv
"""
import asyncio
import logging
import os
import sys
from collections import defaultdict
from collections.abc import Iterable, Generator
from csv import DictReader
from dataclasses import dataclass
from functools import reduce

from wxc_sdk.as_api import AsWebexSimpleApi
from wxc_sdk.common import RouteType, PatternAction
from wxc_sdk.telephony.prem_pstn.dial_plan import DialPlan, PatternAndAction
from wxc_sdk.telephony.prem_pstn.route_group import RouteGroup
from wxc_sdk.telephony.prem_pstn.trunk import Trunk

from config import Config, DialplanConfig

log = logging.getLogger(__name__)


@dataclass()
class Catalog:
    name: str
    patterns: list[str]


def read_patterns(*, csv_file: str) -> dict[str, Catalog]:
    """
    Read patterns from CSV file.

    CSV file is expected to have two columns:
      catalog: catalog identifier; referenced in config.yml
      pattern: dial pattern

    :param csv_file: path to normalized CSV
    :return: Dictionary of Catalog instances keyed by catalog identifier
    """
    log.info(f'reading patterns from {csv_file}')
    with open(csv_file, mode='r') as f:
        reader = DictReader(f, fieldnames=['catalog', 'pattern'])
        records = [r for r in reader]
    patterns_by_catalog = reduce(lambda pbc, record: pbc[record['catalog']].append(record['pattern']) or pbc,
                                 records,
                                 defaultdict(list))
    return {name: Catalog(name=name, patterns=patterns)
            for name, patterns in patterns_by_catalog.items()}


async def configure_wxc(*, csv_file: str):
    """
    Configure dial plans and patterns in Webex Calling.

    Reads patterns from the CSV file and dial plan config from config.yml.
    Authenticates via wxc-sdk OAuth flow. Idempotently reconciles dial plans
    and patterns — adding new patterns and removing obsolete ones.
    """
    config = Config.from_yml('config.yml')
    catalogs = read_patterns(csv_file=csv_file)

    async with AsWebexSimpleApi(tokens=config.tokens.access_token) as api:
        prem_pstn = api.telephony.prem_pstn

        trunk_list, rg_list, dp_list = await asyncio.gather(
            prem_pstn.trunk.list(),
            prem_pstn.route_group.list(),
            prem_pstn.dial_plan.list()
        )

        trunks: dict[str, Trunk] = {trunk.name: trunk for trunk in trunk_list}
        route_groups: dict[str, RouteGroup] = {rg.name: rg for rg in rg_list}
        dialplans: dict[str, DialPlan] = {dp.name: dp for dp in dp_list}

        async def configure_dialplan(dialplan: DialplanConfig, delete_only: bool):
            """
            Reconcile one dial plan: create if missing, update route choice if changed,
            then add/remove patterns to match the target set.
            """
            route_id = None
            if dialplan.route_type == RouteType.trunk:
                route_choice = trunks.get(dialplan.route_choice)
                if route_choice is not None:
                    route_id = route_choice.trunk_id
            else:
                route_choice = route_groups.get(dialplan.route_choice)
                if route_choice is not None:
                    route_id = route_choice.rg_id
            if route_choice is None:
                log.error(f'{dialplan.name}: unknown route choice: '
                          f'"{dialplan.route_choice}" ({dialplan.route_type.value})')
                return

            if (wxc_dialplan := dialplans.get(dialplan.name)) is None:
                if delete_only:
                    return
                response = await prem_pstn.dial_plan.create(name=dialplan.name,
                                                            route_id=route_id,
                                                            route_type=dialplan.route_type.value)
                wxc_dialplan = await prem_pstn.dial_plan.details(dial_plan_id=response.dial_plan_id)
                log.info(f'{dialplan.name}: created')
            elif not delete_only:
                if dialplan.route_type != wxc_dialplan.route_type or route_id != wxc_dialplan.route_id:
                    update = wxc_dialplan.copy(deep=True)
                    update.route_id = route_id
                    update.route_type = dialplan.route_type
                    await api.telephony.prem_pstn.dial_plan.update(update=update)
                    log.info(f'{dialplan.name}: updated route choice to '
                             f'"{dialplan.route_choice}" ({dialplan.route_type.value})')

            patterns = []
            for catalog_name in dialplan.catalogs:
                if (catalog := catalogs.get(catalog_name)) is None:
                    log.error(f'{dialplan.name}: invalid catalog name "{catalog_name}" in dial plan config')
                    continue
                patterns.extend(catalog.patterns)

            patterns = list(set(patterns))
            patterns.sort()

            curr_patterns = set(await prem_pstn.dial_plan.patterns(dial_plan_id=wxc_dialplan.dial_plan_id))
            to_add = set(patterns) - curr_patterns
            to_delete = curr_patterns - set(patterns)

            async def modify_patterns(*, dp_id: str, action: PatternAction, patterns: Iterable[str]):
                """Apply pattern changes in batches of 200 to stay within API limits."""
                if not patterns:
                    return

                def batches(batch_size: int) -> Generator[str, None, None]:
                    pattern_list = list(patterns)
                    pattern_list.sort()
                    for i in range(0, len(pattern_list), batch_size):
                        yield pattern_list[i:i + batch_size]

                await asyncio.gather(*[
                    prem_pstn.dial_plan.modify_patterns(
                        dial_plan_id=dp_id,
                        dial_patterns=[PatternAndAction(dial_pattern=p, action=action) for p in batch]
                    )
                    for batch in batches(200)
                ])

            if delete_only:
                if to_delete:
                    await modify_patterns(dp_id=wxc_dialplan.dial_plan_id,
                                          action=PatternAction.delete,
                                          patterns=to_delete)
                    log.info(f'{dialplan.name}: bulk deleted {len(to_delete)} patterns')
                return
            else:
                if to_add:
                    await modify_patterns(dp_id=wxc_dialplan.dial_plan_id,
                                          action=PatternAction.add,
                                          patterns=to_add)
                    log.info(f'{dialplan.name}: bulk added {len(to_add)} patterns')

            log.info(f'{dialplan.name}: reconciled with {len(patterns)} patterns total')

        for delete_only in [True, False]:
            await asyncio.gather(*[
                configure_dialplan(dialplan=dialplan, delete_only=delete_only)
                for dialplan in config.dialplans
            ])


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) < 2:
        print(f'usage: {os.path.basename(sys.argv[0])} csvfile')
        exit(1)
    asyncio.run(configure_wxc(csv_file=sys.argv[1]))
