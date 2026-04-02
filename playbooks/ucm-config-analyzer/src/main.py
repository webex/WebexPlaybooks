#!/usr/bin/env python
"""
UCM Config Analyzer — entry point for the interactive analysis menu.

What this does:
  Discovers all *.tar UCM BAT exports in the current working directory and runs
  app.App with an interactive CLI of migration-oriented analyses and Plotly charts.

What this does NOT do:
  Does not connect to live UCM or Webex APIs. Not hardened for production use.

Environment:
  No required variables. Run from the directory that contains your export .tar file(s).
"""
import glob
import logging
import os

from app import App

log = logging.getLogger(__name__)


def main():
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s: %(message)s')
    logging.getLogger('digit_analysis.node.traversal').setLevel(logging.INFO)
    logging.getLogger('user_dependency_graph').setLevel(logging.INFO)
    logging.getLogger('ucmexport').setLevel(logging.INFO)
    cur_dir = os.getcwd()
    tar_files = glob.glob(os.path.join(cur_dir, '*.tar'))
    tar_files = sorted(map(os.path.basename, tar_files))
    assert tar_files, f'No TAR files found in {cur_dir}'
    app = App(tar_files=tar_files)
    app.run()
    return


if __name__ == '__main__':
    main()
