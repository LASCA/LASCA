# Ανέβασμα της LASCA στο Oracle Cloud

Οδηγός βήμα-βήμα για Ubuntu 24.04 σε Ampere A1 (Always Free). Όπου βλέπεις `lasca.example.com`
βάλε το δικό σου domain και όπου `IP` τη δημόσια IP του server.

| Πού | Τι |
|---|---|
| `/srv/lasca` | ο κώδικας (git clone, branch `web-pages`) |
| `/srv/lasca/code/.env` | μυστικά και ρυθμίσεις — **ποτέ** στο git |
| `/srv/lasca-data` | βάση, projects, εικόνες χρηστών |
| `/srv/lasca-backups` | αντίγραφα ασφαλείας (14 τελευταία) |

## 1. Σύνδεση στον server

Στο Oracle: **Compute → Instances → το instance σου** → αντιγράφεις τη *Public IP address*.
Από PowerShell στα Windows, με το κλειδί που κατέβασες όταν φτιάχτηκε το instance:

```powershell
icacls C:\Users\user\.ssh\lasca.key /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i C:\Users\user\.ssh\lasca.key ubuntu@IP
```

## 2. Άνοιγμα θυρών 80 και 443

**Στο Oracle:** Networking → Virtual cloud networks → το VCN σου → Subnets → το public subnet →
Security List → *Add Ingress Rules*: Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination port `80`.
Ξανά το ίδιο για `443`.

**Μέσα στον server** (οι εικόνες Ubuntu του Oracle μπλοκάρουν τα πάντα εκτός από το SSH):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 3. Το domain να δείχνει στον server

Στον πάροχο του domain (εκεί που το αγόρασες) → DNS:

| Τύπος | Όνομα | Τιμή |
|---|---|---|
| A | `@` | IP |
| A | `www` | IP |

Έλεγχος από τα Windows: `nslookup lasca.example.com` πρέπει να δείχνει την IP (μπορεί να πάρει από λίγα λεπτά έως μερικές ώρες).

## 4. Προγράμματα του server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx python3-venv python3-dev build-essential sqlite3 \
                    fonts-liberation fonts-dejavu-core certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
# 2GB swap: το build της σελίδας χρειάζεται μνήμη
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5. Ο κώδικας

```bash
sudo mkdir -p /srv/lasca /srv/lasca-data /srv/lasca-backups
sudo chown ubuntu:ubuntu /srv/lasca /srv/lasca-data /srv/lasca-backups
git clone -b web-pages https://github.com/LASCA/LASCA.git /srv/lasca
cd /srv/lasca
python3 -m venv venv
venv/bin/pip install -r deploy/requirements-web.txt
```

## 6. Ρυθμίσεις (`code/.env`)

```bash
cp deploy/env.production.example code/.env
chmod 600 code/.env
python3 -c "import secrets; print(secrets.token_hex(32))"   # τρέξ' το 2 φορές: SECRET_KEY και TOTP_ENCRYPTION_KEY
nano code/.env
```

Συμπλήρωσε τουλάχιστον: `SECRET_KEY`, `TOTP_ENCRYPTION_KEY`, `PUBLIC_URL=https://lasca.example.com`.
Προαιρετικά (η σελίδα δουλεύει και χωρίς αυτά, με λιγότερες λειτουργίες):

- **Email** (επαναφορά κωδικού, επιβεβαίωση email, κωδικοί 2FA, φόρμα επικοινωνίας): στο resend.com → Domains → πρόσθεσε το domain σου και βάλε στο DNS τις εγγραφές που σου δίνει. Μετά `RESEND_API_KEY`, `EMAIL_FROM=LASCA <no-reply@lasca.example.com>`, `NOTIFICATION_EMAIL`.
- **CAPTCHA**: dash.cloudflare.com → Turnstile → Add widget → domain σου → `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. Δεν χρειάζεται το domain να είναι στο Cloudflare.
- **Google**: console.cloud.google.com → Credentials → το OAuth client → *Authorized JavaScript origins* → `https://lasca.example.com` → `GOOGLE_CLIENT_ID`.

Και για το build της σελίδας:

```bash
cat > frontend/.env.production <<'X'
VITE_PUBLIC_URL=https://lasca.example.com
VITE_CONTACT_EMAIL=
X
```

## 7. Build της σελίδας

```bash
cd /srv/lasca/frontend && npm ci || npm install
npm run build
cd ..
```

## 8. Η εφαρμογή ως υπηρεσία (ξεκινάει μόνη της μετά από restart)

```bash
sudo cp deploy/lasca.service /etc/systemd/system/lasca.service
sudo systemctl daemon-reload
sudo systemctl enable --now lasca
systemctl status lasca          # πρέπει να λέει active (running)
curl -I http://127.0.0.1:8000/  # πρέπει να δώσει HTTP/1.1 200
```

Αν δεν ξεκινάει: `journalctl -u lasca -n 50`.

## 9. HTTPS και nginx

```bash
# 1) Πιστοποιητικό (το nginx τρέχει ακόμα με την προεπιλεγμένη σελίδα)
sudo certbot certonly --nginx -d lasca.example.com -d www.lasca.example.com \
     --deploy-hook "systemctl reload nginx"

# 2) Ρυθμίσεις της LASCA
cd /srv/lasca
sed -i 's/lasca.example.com/ΤΟ-DOMAIN-ΣΟΥ/g' deploy/nginx-lasca.conf
sudo cp deploy/lasca-proxy.conf /etc/nginx/snippets/lasca-proxy.conf
sudo cp deploy/nginx-lasca.conf /etc/nginx/sites-available/lasca
sudo ln -sf /etc/nginx/sites-available/lasca /etc/nginx/sites-enabled/lasca
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
git checkout deploy/nginx-lasca.conf   # για να μην «μπλοκάρει» το git pull
```

Άνοιξε `https://lasca.example.com`. Το πιστοποιητικό ανανεώνεται αυτόματα (`sudo certbot renew --dry-run` για έλεγχο).

## 10. Αντίγραφα ασφαλείας κάθε βράδυ

```bash
crontab -e
# πρόσθεσε τη γραμμή:
15 3 * * * bash /srv/lasca/deploy/backup.sh >/dev/null 2>&1
```

## Clerk ↔ lasca.db

Το Clerk κρατάει μόνο τους λογαριασμούς (email, κωδικός, Google)· projects, συνεργάτες, προφίλ και Όροι μένουν στη `lasca.db`.
Κάθε χρήστης της `lasca.db` συνδέεται με τον λογαριασμό του στο Clerk (`users.clerk_user_id`, βλ. `code/clerk_sync.py`):

- **Ρυθμίσεις στο Clerk Dashboard:** User & authentication → Email: «Verify at sign-up» · Personal information:
  «First and last name» ενεργό και υποχρεωτικό (η σελίδα τα δείχνει με αστερίσκο). Σχολή και εταιρεία είναι
  προαιρετικά πεδία της σελίδας: πηγαίνουν στο Clerk ως `unsafe_metadata` και από εκεί στη `lasca.db`.
- **CSP:** ο server επιτρέπει αυτόματα το Frontend API του Clerk (από το `CLERK_PUBLISHABLE_KEY`), το `img.clerk.com`
  και το `*.protect.clerk.com`. Αν αλλάξει το κλειδί, αρκεί restart.

- **Πρώτη είσοδος με Clerk:** με το ίδιο επιβεβαιωμένο email βρίσκει τον παλιό λογαριασμό του, με όλα τα projects.
- **Webhook:** Clerk Dashboard → Webhooks → Add endpoint `https://lasca.gr/api/clerk/webhook`, events `user.created`,
  `user.updated`, `user.deleted`. Το «Signing secret» μπαίνει στο `code/.env` ως `CLERK_WEBHOOK_SECRET`. Έτσι αλλαγή
  ονόματος/email στο Clerk ενημερώνει τη βάση και διαγραφή στο Clerk σβήνει και τον χρήστη εδώ (τα κοινά projects
  περνούν στους συνεργάτες). Αντίστροφα, η «Διαγραφή λογαριασμού» στο Προφίλ σβήνει και τον χρήστη στο Clerk.
- **Οι υπάρχοντες χρήστες στο Clerk με τους ίδιους κωδικούς** (μία φορά, από το `/srv/lasca`):

```
venv/bin/python deploy/clerk_import.py
venv/bin/python deploy/clerk_import.py --probe το-email-σου@example.com
venv/bin/python deploy/clerk_import.py --apply --scrypt-format A
```

Η πρώτη δείχνει τι θα γίνει, η δεύτερη δοκιμάζει με τον δικό σου λογαριασμό ποια μορφή κωδικού δέχεται το Clerk
(σου ζητάει τον κωδικό σου) και η τρίτη περνάει όλους τους υπόλοιπους με τη μορφή που βρήκε η δεύτερη.

## Ενημερώσεις (κάθε φορά που κάνεις push στο `web-pages`)

```bash
ssh -i C:\Users\user\.ssh\lasca.key ubuntu@IP
bash /srv/lasca/deploy/update.sh
```

## Προσοχή

- **Ποτέ** `LASCA_ENV=development` στον server.
- Μην τρέχεις ποτέ `dev_tools.py` στον server (έτσι κι αλλιώς αρνείται).
- Το `TOTP_ENCRYPTION_KEY` δεν αλλάζει ποτέ μετά την πρώτη μέρα.
- Το exe συνδέεται ήδη στο `https://lasca.gr` (`code/cloud_client.py`, γραμμή `DEFAULT_SERVER_URL`). Άλλαξέ το μόνο αν αλλάξει το domain.
- Η «Σύνδεση με Google» του exe ανοίγει τη σελίδα `/desktop-login/...` του server: το `PUBLIC_URL` στο `.env` πρέπει να είναι το πραγματικό domain.
