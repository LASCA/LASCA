#!/usr/bin/env bash
# Ενημέρωση της LASCA στον server μετά από push στο GitHub:
#   bash /srv/lasca/deploy/update.sh
# Κάνει: αντίγραφο ασφαλείας της βάσης → git pull → πακέτα Python → build σελίδας → restart.
set -euo pipefail
cd /srv/lasca

echo "→ Αντίγραφο ασφαλείας βάσης"
bash deploy/backup.sh

echo "→ Νέος κώδικας από το GitHub"
git pull --ff-only

echo "→ Πακέτα Python"
venv/bin/pip install --quiet -r deploy/requirements-web.txt

echo "→ Build της σελίδας"
cd frontend
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
cd ..

echo "→ Επανεκκίνηση"
sudo systemctl restart lasca
sleep 2
systemctl --no-pager --lines=5 status lasca
echo "✓ Έτοιμο"
