#!/bin/bash
echo Logs are being captured by frontail.
pnpm exec ts-node-dev --respawn --exit-child --debug -- server/index.ts |& \
  pnpm exec frontail \
    --ui-highlight \
    --ui-highlight-preset server/log-highlight.json \
    --port 9002 \
    --url-path /log/server \
    "-"
