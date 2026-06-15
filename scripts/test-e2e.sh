#!/usr/bin/env bash
set -euo pipefail

ARGS=("$@")
if [ ${#ARGS[@]} -eq 0 ]; then
  CMD="playwright test"
else
  # shellcheck disable=SC2068
  CMD="playwright test ${ARGS[@]}"
fi

exec firebase emulators:exec --project tertoct-e2e --only firestore,auth "$CMD"
