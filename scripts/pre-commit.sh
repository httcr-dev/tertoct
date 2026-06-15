#!/usr/bin/env bash
# Pre-commit gate: lint, typecheck, unit/rules/e2e tests, optional Firestore dev deploy.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

step "ESLint"
npm run lint

step "TypeScript (tsc --noEmit)"
npm run typecheck

step "Jest (unit + integração)"
npm test

step "Firestore rules (emulador + jest)"
npm run test:rules

if [[ "${PRE_COMMIT_SKIP_E2E:-}" == "1" ]]; then
  echo ""
  echo "⏭  PRE_COMMIT_SKIP_E2E=1 — E2E ignorado."
else
  step "Playwright E2E (emuladores Auth + Firestore)"
  npm run test:e2e
fi

step "Firestore dev (rules/indexes, se alterados)"
bash scripts/deploy-firestore-dev.sh

echo ""
echo "✅ Pre-commit OK — lint, testes e validações passaram."
