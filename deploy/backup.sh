#!/usr/bin/env bash
# Αντίγραφο ασφαλείας της βάσης και των projects (κρατάει τα τελευταία 14).
# Αυτόματα κάθε βράδυ (crontab -e):
#   15 3 * * * bash /srv/lasca/deploy/backup.sh >/dev/null 2>&1
set -euo pipefail
DATA=/srv/lasca-data
DEST=/srv/lasca-backups
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
# .backup: σωστό αντίγραφο ακόμα κι αν η βάση χρησιμοποιείται εκείνη τη στιγμή
sqlite3 "$DATA/lasca.db" ".backup '$DEST/lasca-$STAMP.db'"
tar -czf "$DEST/projects-$STAMP.tar.gz" -C "$DATA" projects avatars 2>/dev/null || true
chmod 600 "$DEST"/*-"$STAMP".*
ls -1t "$DEST"/lasca-*.db | tail -n +15 | xargs -r rm --
ls -1t "$DEST"/projects-*.tar.gz | tail -n +15 | xargs -r rm --
echo "backup: $DEST/lasca-$STAMP.db"
