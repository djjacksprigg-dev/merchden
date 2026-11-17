#!/bin/sh
# Runs every end-to-end test against a production build served with the real headers.
cd "$(dirname "$0")"
for t in workflow_test.py jersey_test.py collection_board_test.py privacy_project_test.py portfolio_test.py devices_test.py catalogue_test.py text_and_patterns_test.py scenes_and_backgrounds_test.py; do
  echo "=== $t"
  timeout 900 python3 "$t" 2>&1 | grep -E "^(PASS|FAIL)|passed|products OK|Error|Traceback" | grep -v "^PASS"
done
