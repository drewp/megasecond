#!/bin/bash
echo Logs are being captured by frontail.
pnpm exec vite |& \
  pnpm exec frontail \
    --ui-highlight \
    --ui-highlight-preset server/log-highlight.json \
    --port 9001 \
    --url-path /log/rebuild \
    -
