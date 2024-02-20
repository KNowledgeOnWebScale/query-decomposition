#!/bin/bash
set -euxo pipefail

SCRIPT_PATH="$(dirname "$0")"

pnpm exec community-solid-server --config @css:config/file-no-setup.json  --rootFilePath "solid_server/data" --loggingLevel info