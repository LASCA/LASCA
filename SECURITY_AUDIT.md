# LASCA — Έλεγχος ασφαλείας & redesign (Οκτώβριος 2026)

Branches: `redesign-web` (από `web-pages`) και `redesign-desktop` (από `cloud`).
Δοκιμές: `python code/tests/test_security.py` (~120 έλεγχοι «επίθεσης»), `python code/tests/test_collab.py`,
έλεγχος σε browser (εγγραφή → 2FA → σύνδεση με εφεδρικό κωδικό → επαναφορά/επιβεβαίωση email), και
ανεξάρτητος έλεγχος του κώδικα σύνδεσης από δεύτερο «reviewer» (τα 8 ευρήματά του διορθώθηκαν, βλ. §7).

## 1. Οι 5 κρίσιμες ευπάθειες του login

| # | Ζητούμενο | Τι υπάρχει τώρα |
|---|---|---|
| 1 | Token σε localStorage → httpOnly cookies | Η σύνδεση ήταν ήδη με cookie (όχι localStorage). Τώρα: `HttpOnly`, `Secure`, **`SameSite=Strict`**, πρόθεμα `__Host-`, «να με θυμάσαι» έως 90 ημέρες, το logout σβήνει και το remember-cookie (βρέθηκε και διορθώθηκε bug). Το exe κρατά το κλειδί του κρυπτογραφημένο (DPAPI). |
| 2 | Έλεγχοι διαχειριστή στον client | Δεν υπάρχει admin panel. Όλα τα δικαιώματα (ιδιοκτήτης/επεξεργαστής/αναγνώστης) ελέγχονται στον server: `get_project()` σε κάθε route και νέος κεντρικός έλεγχος για ΟΛΑ τα endpoints υπολογισμών που αναφέρουν project (κλείνει IDOR που βρέθηκε). `dev_tools.py` αρνείται να τρέξει χωρίς `LASCA_ENV=development`. |
| 3 | Χωρίς 2FA | 2FA με **εφαρμογή authenticator (TOTP)** ή **κωδικό στο email**, **10 εφεδρικοί κωδικοί** (μόνο hash), μυστικό κρυπτογραφημένο (Fernet), λήξη κωδικού email 10′, προστασία επανάληψης, όρια (5 λάθη/15′), ενεργοποίηση μόνο με κωδικό λογαριασμού, ισχύει και για Google login και για το exe. Admins: δεν υπάρχουν· όποτε μπουν, το `reauthenticate()` + 2FA είναι έτοιμα. |
| 4 | Χωρίς rate limiting | /login, /register, /auth/forgot, /auth/reset, /auth/2fa/verify, device-token: 5 αποτυχίες/15′ ανά IP (IPv6 ανά /64), αναμονή 1→60″ μετά από 3 λάθη, CAPTCHA (Cloudflare Turnstile) μετά από 3 λάθη, κλείδωμα μετά από 10 («μαλακό»: ο κάτοχος μπαίνει με σωστό κωδικό + CAPTCHA, ώστε να μην μπορεί κανείς να κλειδώνει ξένους λογαριασμούς), καταγραφή κάθε αποτυχίας. Επιπλέον όρια στο nginx. |
| 5 | Χωρίς έλεγχο ισχύος κωδικού | Frontend: zxcvbn + μετρητής + λίστα κανόνων σε πραγματικό χρόνο. Backend: ≥12 χαρακτήρες, κεφαλαίο/πεζό/αριθμός/σύμβολο, όχι στους 10.000 πιο συνηθισμένους (και «Password123!»), όχι email/όνομα, έλεγχος haveibeenpwned (k-anonymity). |

## 2. «20 πράγματα πριν από το launch» (app)

1 Κλειδιά κρυμμένα: κανένα μυστικό στο frontend· αφαιρέθηκε το `VITE_GITHUB_TOKEN` από το exe· το exe δεν διαβάζει πια `.env` από μέσα του (το κλειδί Resend θα έφευγε μαζί)· τα μηνύματα του exe πάνε μέσω του server. ·
2 RLS: N/A (SQLite, όχι Supabase) — αντίστοιχα, κάθε query φιλτράρει ανά χρήστη/ρόλο. ·
3/6/19 IDOR / απομόνωση / πρόσβαση εγγραφών: δοκιμές με δεύτερο χρήστη σε 14 endpoints. ·
4 Μυστικά στο git: έλεγχος όλου του ιστορικού (καθαρό) + gitleaks στο CI· το `feedback.jsonl` (emails) βγήκε από το git του desktop. ·
5 Admin routes: βλ. #2. · 7 Rate limits: §1/§3. · 8 Storage buckets: N/A· τα αρχεία είναι εκτός `static`, οι εικόνες προφίλ μόνο σε συνεργάτες. ·
9 Επικύρωση εισόδων: ονόματα project, email, μήκη, τύποι JSON. · 10 Χωρίς σύνδεση: όλα τα `/api/*` εκτός από λίστα δημόσιων (δοκιμή σε κάθε route). ·
11 SQL injection: ORM με παραμέτρους, δοκιμές. · 12 Ευαίσθητα logs: όχι emails/κωδικοί/συνδέσμοι/θέματα στα logs, μάσκα IP στο ιστορικό χρήστη. ·
13 Αλλοίωση πεδίων: αγνοούνται email/id/2FA/ρόλος owner. · 14 Uploads: έλεγχος περιεχομένου με Pillow, ξανα-κωδικοποίηση σε WEBP (χωρίς EXIF), όριο μεγέθους, όριο pixels. ·
15 Λογική στον server: ναι. · 16 Λιτές απαντήσεις: χωρίς hashes/μυστικά, χωρίς διαδρομές αρχείων στα 500. · 17 Sessions: §1 + λήξη κλειδιών exe μετά από 90 ημέρες αχρησίας. ·
18 Dependencies: `pip-audit`, `npm audit` στο CI (`.github/workflows/security.yml`). · 20 Επίθεση στην εφαρμογή: `test_security.py` + ανεξάρτητος reviewer.

## 3. «20 πράγματα πριν από το launch» (website)

Πολιτική απορρήτου (`/privacy`), Όροι (`/terms`), Cookies (`/cookies`) · κανένα μυστικό στο frontend · Force HTTPS (nginx 301 + HSTS + `upgrade-insecure-requests`) ·
ενημέρωση cookies (μόνο απαραίτητα → χωρίς συγκατάθεση) · meta τίτλοι/περιγραφές ανά σελίδα · εικόνα προεπισκόπησης `og-image.png` 1200×630 · favicon/apple-touch/manifest ·
`sitemap.xml` + `robots.txt` (δυναμικά) · alt σε όλες τις εικόνες · συμπίεση (λογότυπο 48KB→1.5KB, 285KB→2KB) · ταχύτητα: lazy φόρτωση εφαρμογής/σελίδων, zxcvbn μόνο όταν χρειαστεί ·
αντίθεση: κείμενα ≥ 8:1 στο σκούρο φόντο · mobile: ελέγχθηκε στα 390px · σελίδα 404 (με πραγματικό status 404) · σπασμένος σύνδεσμος «Εγχειρίδιο» αφαιρέθηκε ·
επικύρωση φορμών (client + server) · spam: Turnstile + κρυφό πεδίο + όρια εγγραφών · analytics: προαιρετικά, χωρίς cookies, σέβονται Do-Not-Track · ένα σαφές CTA («Ξεκίνα δωρεάν»).

## 4. Compliance & κόστος

Age gate (≥15, ν. 4624/2019 άρθρο 21) με αποδοχή όρων — και για Google · τοπικές γραμματοσειρές (καμία κλήση Google Fonts, ούτε στο exe) · καμία καταγραφή συνεδρίας ·
unsubscribe/διεύθυνση: N/A (μόνο transactional emails) · όροι ανανέωσης: N/A (δωρεάν, χωρίς συνδρομές — γραμμένο στους Όρους) · payment webhooks (Stripe): N/A ·
όρια/quotas: projects ανά χρήστη, μέλη, ενεργές προσκλήσεις, μέγεθος αιτήματος, throttling ανά IP/χρήστη, όριο emails ανά ημέρα/παραλήπτη, CAPTCHA.

## 5. Επιπλέον μέτρα

CSP χωρίς inline scripts, `frame-ancestors 'none'`, nosniff, Referrer/Permissions-Policy, COOP · έλεγχος Origin (CSRF) σε κάθε αλλαγή δεδομένων ·
επιβεβαίωση email + ανάκτηση «κατειλημμένων» λογαριασμών μέσω Google · επαναφορά κωδικού με σύνδεσμο μίας χρήσης (30′, token στο `#`) · ιστορικό συνδέσεων στο Προφίλ ·
SECRET_KEY υποχρεωτικό (≥32) στον server · **exe**: ο τοπικός server δέχεται μόνο το παράθυρο της εφαρμογής (Host/Origin/Sec-Fetch-Site → προστασία από ιστοσελίδες και DNS rebinding), τυχαίο μυστικό ανά εκκίνηση, CSP, μόνο https προς το cloud.

## 6. Τι μένει σε εσένα

1. `npm install` (νέα πακέτα: γραμματοσειρές, zxcvbn) και `pip install -r deploy/requirements-web.txt` (cryptography, qrcode).
2. Στον server `.env`: `SECRET_KEY`, `TOTP_ENCRYPTION_KEY`, `TURNSTILE_*`, `RESEND_API_KEY` + `EMAIL_FROM` με verified domain, `PUBLIC_URL`.
3. `frontend/.env.production`: `VITE_PUBLIC_URL`, `VITE_CONTACT_EMAIL`.
4. nginx: τα νέα `deploy/nginx-lasca.conf` και `deploy/lasca-proxy.conf`.
5. Αν το κλειδί Resend υπήρξε ποτέ σε `.env` μέσα σε exe/zip που μοιράστηκε: **άλλαξέ το**.
6. Το `feedback.jsonl` υπάρχει ακόμα στο παλιό ιστορικό του `main`: για πλήρη αφαίρεση χρειάζεται `git filter-repo`.
7. Τα νομικά κείμενα περιγράφουν ακριβώς τι κάνει ο κώδικας, αλλά δεν είναι νομική συμβουλή.

## 7. Ευρήματα του ανεξάρτητου ελέγχου (όλα διορθώθηκαν, με δοκιμή)

Κατάληψη λογαριασμού με ξένο email πριν την εγγραφή του κατόχου · παράκαμψη TOTP μέσω email · lockout DoS από το endpoint του exe ·
ενεργοποίηση 2FA χωρίς κωδικό · κλειδιά exe που επιζούσαν της ενεργοποίησης 2FA · λογαριασμοί Google χωρίς επανέλεγχο ταυτότητας ·
500 σε JSON λίστα · συνθήκες ανταγωνισμού σε κωδικούς μίας χρήσης · IPv6 · χρόνος απάντησης forgot-password · κωδικοί σε logs · παλιά cookies χωρίς έκδοση.
Παραμένει (γνωστό, χαμηλό ρίσκο): συνδεδεμένος χρήστης μπορεί να ελέγξει αν ένα ακριβές email έχει λογαριασμό (χρειάζεται για την κοινοποίηση· με όριο αιτημάτων).
