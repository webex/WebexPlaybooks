#!/usr/bin/env python
"""
Stage 2 of the UCM-to-Webex Calling dial plan migration pipeline.

WHAT THIS SCRIPT DOES:
  Reads a CSV file of UCM ILS-learned patterns (output of read_ucm.py) and
  normalizes them into a format consumable by Webex Calling dial plans.
  Handles bracket notation expansion (e.g. [2-9] → individual digits) and
  resolves cross-catalog conflicts. Normalized output is written to stdout.

WHAT IT DOES NOT DO:
  - Does not provision anything in Webex Calling.
  - Does not validate patterns against the Webex Calling API.

USAGE:
  python normalize.py read_ucm.csv > normalized.csv

NO ENVIRONMENT VARIABLES REQUIRED.
"""
import logging
import os.path
import re
import sys
from collections import defaultdict
from csv import DictReader
from itertools import groupby
from typing import Iterable, Generator


def normalize(*, patterns: Iterable[str]) -> Generator[str, None, None]:
    """
    Normalize a sequence of dial patterns for Webex Calling.

    Expands bracket notation (e.g. [2-9]) into individual digit patterns.
    Rejects patterns containing wildcards (*, ., !) as unsupported by Webex Calling.
    """
    catch_re = re.compile(r'(?P<pre>.*)(?P<re_part>\[.+])(?P<post>.*)')
    for pattern in patterns:
        if any(c in pattern for c in '.*!'):
            print(f'illegal pattern format: {pattern}', file=sys.stderr)
            continue
        if m := catch_re.match(pattern):
            pre = m.group('pre')
            re_part = m.group('re_part')
            post = m.group('post')
            digit_matcher = re.compile(re_part)
            matching_digits = (d for d in '0123456789'
                               if digit_matcher.match(d))
            logging.debug(f'expanding "{pattern}"')
            for d in matching_digits:
                expanded = f'{pre}{d}{post}'
                logging.debug(f' {expanded}')
                yield expanded
        else:
            yield pattern


def read_and_normalize(csv_name: str):
    """
    Read patterns from CSV, normalize them, and print to stdout.
    Conflict resolution details are printed to stderr.
    """
    with open(csv_name, mode='r', encoding='utf-8-sig') as csv_file:
        reader = DictReader(csv_file, dialect='excel')
        records = list(reader)
    records.sort(key=lambda r: r['remotecatalogkey_id'])
    grouped = {catalog: set(r['pattern'] for r in riter)
               for catalog, riter in groupby(records, key=lambda r: r['remotecatalogkey_id'])}
    grouped: dict[str, set[str]]

    normalized_by_source = defaultdict(list)
    for catalog in grouped:
        for pattern in grouped[catalog]:
            for normalized in normalize(patterns=[pattern]):
                normalized_by_source[normalized].append((catalog, pattern))
    duplicates = {n: l for n, l in normalized_by_source.items()
                  if len(l) > 1}

    for duplicate in duplicates:
        origin_patterns = [o for _, o in duplicates[duplicate]]
        normalized_from_origin = {o: set(normalize(patterns=[o])) for o in origin_patterns}
        normalized_from_origin: dict[str, set[str]]
        origin_patterns.sort(key=lambda o: len(normalized_from_origin[o]))
        for i in range(len(origin_patterns) - 1):
            more_specific = normalized_from_origin[origin_patterns[i]]
            for l in range(i + 1, len(origin_patterns)):
                less_specific = normalized_from_origin[origin_patterns[l]]
                less_specific.difference_update(more_specific)
        print(f'Conflict resolution: {", ".join(origin_patterns)}', file=sys.stderr)
        for catalog, pattern in duplicates[duplicate]:
            print(f' Replacing pattern {pattern} in catalog "{catalog}" with '
                  f'{", ".join(sorted(normalized_from_origin[pattern]))}', file=sys.stderr)
            grouped[catalog].difference_update([pattern])
            grouped[catalog].update(normalized_from_origin[pattern])

    results = {}
    for catalog, patterns in grouped.items():
        normalized_patterns = list(normalize(patterns=patterns))
        normalized_patterns.sort()
        print('\n'.join(f'{catalog},{pattern}' for pattern in normalized_patterns))
        results[catalog] = (len(patterns), len(normalized_patterns))
    before_total, after_total = 0, 0
    for catalog, (before, after) in results.items():
        before_total += before
        after_total += after
        print(f'{catalog}: {before} patterns normalized to {after} patterns', file=sys.stderr)
    print(f'{before_total} patterns normalized to {after_total} patterns', file=sys.stderr)


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) < 2:
        print(f'usage: {os.path.basename(sys.argv[0])} csvfile')
        exit(1)
    read_and_normalize(csv_name=sys.argv[1])
