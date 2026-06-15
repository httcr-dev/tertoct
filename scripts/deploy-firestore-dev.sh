#!/usr/bin/env bash
# Deploy Firestore rules + indexes to the dev Firebase project when staged files changed.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FIREBASE_DEV_ALIAS="${FIREBASE_DEV_PROJECT:-dev}"

if [[ "${SKIP_FIRESTORE_DEV_DEPLOY:-}" == "1" ]]; then
  echo "⏭  SKIP_FIRESTORE_DEV_DEPLOY=1 — deploy dev do Firestore ignorado."
  exit 0
fi

CHANGED="$(git diff --cached --name-only -- firestore.rules firestore.indexes.json 2>/dev/null || true)"
if [[ -z "$CHANGED" ]]; then
  echo "✓ firestore.rules / firestore.indexes.json inalterados — deploy dev não necessário."
  exit 0
fi

echo "→ Arquivos Firestore alterados no commit:"
echo "$CHANGED" | sed 's/^/   /'

if ! command -v firebase >/dev/null 2>&1 && ! npx --yes firebase --version >/dev/null 2>&1; then
  echo "✗ Firebase CLI não encontrado. Instale com: npm install"
  exit 1
fi

FIREBASE_CMD=(npx firebase)
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD=(firebase)
fi

echo "→ Publicando rules + indexes no projeto Firebase alias \"${FIREBASE_DEV_ALIAS}\"..."
"${FIREBASE_CMD[@]}" deploy \
  --only firestore:rules,firestore:indexes \
  --project "$FIREBASE_DEV_ALIAS" \
  --non-interactive

echo "✓ Firestore rules/indexes publicados em dev."
