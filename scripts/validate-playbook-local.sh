#!/usr/bin/env bash
# Local validation script matching .github/workflows/validate-then-publish-to-integration.yml
# Usage: ./scripts/validate-playbook-local.sh playbooks/meetings-exporter
# Run `npm ci` once from the repo root so the competitor check (Node) can load js-yaml.

FOLDER="${1:-playbooks/meetings-exporter}"
REPORT=$(bash scripts/ci/validate-playbook-folder.sh "$FOLDER")
EC=$?

echo -e "# Playbook Validation Results\n\n${REPORT}"
echo ""
echo "Validation complete. Result: $([ $EC -eq 0 ] && echo 'pass' || echo 'fail')"
exit $EC
