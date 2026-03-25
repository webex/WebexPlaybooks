#!/usr/bin/env bash
# Local validation script matching .github/workflows/validate-playbook.yml
# Usage: ./scripts/validate-playbook-local.sh playbooks/meetings-exporter
# Run `npm ci` once from the repo root so the competitor check (Node) can load js-yaml.

# Helper: extract YAML array items for a key (stops at next top-level key)
yaml_array_items() { awk -v key="$1" '$0 ~ "^" key ":"{f=1;next} f{if($0~/^[a-zA-Z_][a-zA-Z0-9_]*:/)exit; if($0~/^[[:space:]]+-[[:space:]]/)print}' "$2"; }

FOLDER="${1:-playbooks/meetings-exporter}"
FOLDER_NAME=$(basename "$FOLDER")
REPORT=""
FOLDER_FAILED=0

# README.md exists
if [ -f "${FOLDER}/README.md" ]; then
  REPORT="${REPORT}- [x] README.md exists\n"
else
  REPORT="${REPORT}- [ ] README.md exists — *Add README.md with all 6 required sections*\n"
  FOLDER_FAILED=1
fi

# README.md contains all 6 required section headers (case-insensitive)
if [ -f "${FOLDER}/README.md" ]; then
  README_LOWER=$(tr '[:upper:]' '[:lower:]' < "${FOLDER}/README.md")
  MISSING=""
  for SECTION in "use case overview" "architecture" "prerequisites" "code scaffold" "deployment guide" "known limitations"; do
    if ! echo "$README_LOWER" | grep -q "## $SECTION"; then
      MISSING="${MISSING}${MISSING:+, }$SECTION"
    fi
  done
  if [ -z "$MISSING" ]; then
    REPORT="${REPORT}- [x] README.md contains all 6 required section headers\n"
  else
    REPORT="${REPORT}- [ ] README.md contains all 6 required sections — *Add missing: ${MISSING}*\n"
    FOLDER_FAILED=1
  fi
fi

# APPHUB.yaml exists
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  REPORT="${REPORT}- [x] APPHUB.yaml exists\n"
else
  REPORT="${REPORT}- [ ] APPHUB.yaml exists — *Add APPHUB.yaml with all required metadata fields*\n"
  FOLDER_FAILED=1
fi

# No prohibited competitors in APPHUB metadata (Genesys, NICE, Five9, Talkdesk / CXone)
# Script exit: 0 = ok, 1 = violations, 2+ = script/YAML/module error (do not label as competitor)
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  node scripts/check-competitor-tools.js "$FOLDER" 2>competitor-check.err
  comp_ec=$?
  COMP_MSG=$(tr '\n' ' ' < competitor-check.err | sed 's/[[:space:]]\{2,\}/ /g')
  if [ "$comp_ec" -eq 0 ]; then
    REPORT="${REPORT}- [x] No prohibited competitor as primary integration target (APPHUB metadata)\n"
  elif [ "$comp_ec" -eq 1 ]; then
    REPORT="${REPORT}- [ ] Prohibited competitor in APPHUB metadata — *${COMP_MSG}*\n"
    FOLDER_FAILED=1
  else
    REPORT="${REPORT}- [ ] Competitor check failed (script or APPHUB.yaml) — *${COMP_MSG}*\n"
    FOLDER_FAILED=1
  fi
  rm -f competitor-check.err
fi

# All required APPHUB.yaml fields present and non-empty
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  REQUIRED_FIELDS="friendly_id title description tag_line estimated_implementation_time product_types categories product_url privacy_url"
  FIELDS_MISSING=""
  for FIELD in $REQUIRED_FIELDS; do
    if [ "$FIELD" = "product_types" ] || [ "$FIELD" = "categories" ]; then
      LINE=$(grep -E "^${FIELD}:" "${FOLDER}/APPHUB.yaml" 2>/dev/null)
      if [ -z "$LINE" ]; then
        FIELDS_MISSING="${FIELDS_MISSING}${FIELDS_MISSING:+, }${FIELD}"
      else
        ITEMS=$(yaml_array_items "$FIELD" "${FOLDER}/APPHUB.yaml" | wc -l)
        if [ "$ITEMS" -lt 1 ]; then
          FIELDS_MISSING="${FIELDS_MISSING}${FIELDS_MISSING:+, }${FIELD}"
        fi
      fi
    else
      LINE=$(grep -E "^${FIELD}:" "${FOLDER}/APPHUB.yaml" 2>/dev/null)
      VALUE=""
      if [ -n "$LINE" ]; then
        VALUE=$(echo "$LINE" | sed -E 's/^[^:]*:[[:space:]]*["'\'']*([^"'\'']*)["'\'']*[[:space:]]*$/\1/' | tr -d ' ')
      fi
      if [ -z "$LINE" ] || [ -z "$VALUE" ]; then
        FIELDS_MISSING="${FIELDS_MISSING}${FIELDS_MISSING:+, }${FIELD}"
      fi
    fi
  done
  if [ -z "$FIELDS_MISSING" ]; then
    REPORT="${REPORT}- [x] All required APPHUB.yaml fields present and non-empty\n"
  else
    REPORT="${REPORT}- [ ] APPHUB.yaml fields complete — *Fill in: ${FIELDS_MISSING}*\n"
    FOLDER_FAILED=1
  fi
fi

# APPHUB.yaml categories exists and has at least one value
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  CATEGORIES_LINE=$(yaml_array_items "categories" "${FOLDER}/APPHUB.yaml")
  CAT_COUNT=$(echo "$CATEGORIES_LINE" | grep -c . 2>/dev/null || echo 0)
  if [ "${CAT_COUNT:-0}" -ge 1 ]; then
    REPORT="${REPORT}- [x] APPHUB.yaml categories has at least one value\n"
  else
    REPORT="${REPORT}- [ ] APPHUB.yaml categories — *Add at least one category (verticals: healthcare, financial-services, retail-ecommerce; app categories: developer-tools, productivity, etc.)*\n"
    FOLDER_FAILED=1
  fi
fi

# APPHUB.yaml friendly_id ends with -playbook
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  FRIENDLY_ID=$(grep -E "^friendly_id:" "${FOLDER}/APPHUB.yaml" | sed -E 's/friendly_id:[[:space:]]*["'\'']?([^"'\'']*)["'\'']?.*/\1/' | tr -d ' ')
  if echo "$FRIENDLY_ID" | grep -qE '\-playbook$'; then
    REPORT="${REPORT}- [x] APPHUB.yaml friendly_id ends with -playbook\n"
  else
    REPORT="${REPORT}- [ ] APPHUB.yaml friendly_id — *Must end with -playbook (e.g. meetings-exporter-playbook)*\n"
    FOLDER_FAILED=1
  fi
fi

# APPHUB.yaml tag_line max 128 characters
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  TAG_LINE_LINE=$(grep -E "^tag_line:" "${FOLDER}/APPHUB.yaml" 2>/dev/null)
  if [ -n "$TAG_LINE_LINE" ]; then
    TAG_LINE_VALUE=$(echo "$TAG_LINE_LINE" | sed -E 's/^tag_line:[[:space:]]*//' | sed -E 's/^["'\'']//;s/["'\'']$//')
    TAG_LINE_LEN=${#TAG_LINE_VALUE}
    if [ "$TAG_LINE_LEN" -gt 128 ]; then
      REPORT="${REPORT}- [ ] APPHUB.yaml tag_line — *Max 128 characters (current: ${TAG_LINE_LEN})*\n"
      FOLDER_FAILED=1
    else
      REPORT="${REPORT}- [x] APPHUB.yaml tag_line is valid (${TAG_LINE_LEN}/128 chars)\n"
    fi
  fi
fi

# APPHUB.yaml product_types is array with allowed values
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  if ! grep -qE "^product_types:" "${FOLDER}/APPHUB.yaml"; then
    REPORT="${REPORT}- [ ] APPHUB.yaml product_types — *Add product_types array with at least one of: teams, meetings, calling, rooms, contact_center*\n"
    FOLDER_FAILED=1
  else
    PRODUCT_TYPES_LINE=$(yaml_array_items "product_types" "${FOLDER}/APPHUB.yaml")
    PRODUCT_TYPES_INVALID=""
    PRODUCT_TYPES_COUNT=0
    VALID_PRODUCT_TYPES="teams|meetings|calling|rooms|contact_center"
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      PT=$(echo "$line" | sed -E 's/^[[:space:]]*-[[:space:]]*["'\'']?([^"'\'']*)["'\'']?.*/\1/' | tr -d ' ')
      if [ -n "$PT" ]; then
        PRODUCT_TYPES_COUNT=$((PRODUCT_TYPES_COUNT + 1))
        if ! echo "$PT" | grep -qE "^(${VALID_PRODUCT_TYPES})$"; then
          PRODUCT_TYPES_INVALID="${PRODUCT_TYPES_INVALID}${PRODUCT_TYPES_INVALID:+, }${PT}"
        fi
      fi
    done <<< "$PRODUCT_TYPES_LINE"
    if [ -z "$PRODUCT_TYPES_INVALID" ] && [ "$PRODUCT_TYPES_COUNT" -ge 1 ]; then
      REPORT="${REPORT}- [x] APPHUB.yaml product_types is valid\n"
    else
      REPORT="${REPORT}- [ ] APPHUB.yaml product_types valid — *Use array with one or more of: teams, meetings, calling, rooms, contact_center*\n"
      FOLDER_FAILED=1
    fi
  fi
fi

# APPHUB.yaml app_context exists and values are allowed
if [ -f "${FOLDER}/APPHUB.yaml" ]; then
  if ! grep -qE "^app_context:" "${FOLDER}/APPHUB.yaml"; then
    REPORT="${REPORT}- [ ] APPHUB.yaml app_context — *Add app_context with at least one value*\n"
    FOLDER_FAILED=1
  else
    APP_CONTEXT_LINE=$(yaml_array_items "app_context" "${FOLDER}/APPHUB.yaml")
    APP_CONTEXT_INVALID=""
    VALID_APP_CONTEXTS="space|in_meeting|call|device|contact_center|sidebar|mcp|a2a"
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      CTX=$(echo "$line" | sed -E 's/^[[:space:]]*-[[:space:]]*["'\'']?([^"'\'']*)["'\'']?.*/\1/' | tr -d ' ')
      if [ -n "$CTX" ] && ! echo "$CTX" | grep -qE "^(${VALID_APP_CONTEXTS})$"; then
        APP_CONTEXT_INVALID="${APP_CONTEXT_INVALID}${APP_CONTEXT_INVALID:+, }${CTX}"
      fi
    done <<< "$APP_CONTEXT_LINE"
    if [ -z "$APP_CONTEXT_INVALID" ]; then
      REPORT="${REPORT}- [x] APPHUB.yaml app_context values are valid\n"
    else
      REPORT="${REPORT}- [ ] APPHUB.yaml app_context valid — *Each value must be one of: space, in_meeting, call, device, contact_center, sidebar, mcp, a2a*\n"
      FOLDER_FAILED=1
    fi
  fi
fi

# /diagrams/ folder exists
if [ -d "${FOLDER}/diagrams" ]; then
  REPORT="${REPORT}- [x] /diagrams/ folder exists\n"
else
  REPORT="${REPORT}- [ ] /diagrams/ folder exists — *Create diagrams/ and add architecture diagram*\n"
  FOLDER_FAILED=1
fi

# /src/ folder exists
if [ -d "${FOLDER}/src" ]; then
  REPORT="${REPORT}- [x] /src/ folder exists\n"
else
  REPORT="${REPORT}- [ ] /src/ folder exists — *Create src/ with working code*\n"
  FOLDER_FAILED=1
fi

# Folder name matches kebab-case (no spaces, no uppercase)
if echo "$FOLDER_NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  REPORT="${REPORT}- [x] Folder name is kebab-case\n"
else
  REPORT="${REPORT}- [ ] Folder name is kebab-case — *Use lowercase, hyphens only (e.g. epic-ehr, servicenow)*\n"
  FOLDER_FAILED=1
fi

echo -e "# Playbook Validation Results\n\n## Playbook: \`${FOLDER}\`\n\n$REPORT"
echo ""
echo "Validation complete. Result: $([ $FOLDER_FAILED -eq 0 ] && echo 'pass' || echo 'fail')"
exit $FOLDER_FAILED
