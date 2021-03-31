#!/bin/bash
echo Logs are being captured by frontail.
pnpm rebuild_client_forever |& \
  pnpx frontail \
    --ui-highlight \
    --ui-highlight-preset server/log-highlight.json \
    --port 9001 \
    --url-path /log/rebuild \
    -
