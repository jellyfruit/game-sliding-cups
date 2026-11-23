#!/bin/sh
# Run all tests: ./tests/run.sh        (Node only)
#                ./tests/run.sh --e2e   (plus browser end-to-end)
cd "$(dirname "$0")/.." || exit 1
node tests/core.test.js && node tests/golden.test.js && node tests/i18n.test.js && node tests/version.test.js || exit 1
[ "$1" = "--e2e" ] && python3 tests/e2e/run.py
