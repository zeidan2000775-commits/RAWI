#!/usr/bin/env bash
# روي — نشر قواعد الأمان والفهارس إلى Firebase.
# يتطلب: firebase-tools مثبّتة ومسجّلة الدخول (firebase login).
set -euo pipefail
cd "$(dirname "$0")/.."
echo "🚀 نشر Firestore Rules + Indexes إلى rawi-bc58f…"
npx --yes firebase-tools deploy --only firestore:rules,firestore:indexes --project "${FIREBASE_PROJECT_ID:-rawi-bc58f}"
echo "✅ تم."
