#!/bin/sh
# 跑全部測試：./tests/run.sh        （只跑 Node）
#            ./tests/run.sh --e2e   （加上瀏覽器端到端）
cd "$(dirname "$0")/.." || exit 1
node tests/core.test.js && node tests/golden.test.js && node tests/i18n.test.js && node tests/version.test.js || exit 1
[ "$1" = "--e2e" ] && python3 tests/e2e/run.py
