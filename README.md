# Torbe — Familjens semesterbokningssida

En bokningssajt för Torbe-familjens lägenhet i Spanien (Mil Palmeras). Byggd med Next.js, Prisma och PostgreSQL.

## Funktioner

- **Bokningskalender** — visar lediga och bokade datum, med gästnamn i rutorna
- **Bokningsflöde** — inloggade användare skickar en önskning (PENDING) som admin godkänner eller avvisar
- **Admin-dashboard** med tre flikar:
  - **Bokningar** — lista alla bokningar, godkänn/avvisa önskningar, lägg till manuella bokningar (med gästnamn), ta bort bokningar
  - **Tips & aktiviteter** — lägg till/ta bort tips med kategori, beskrivning, adress, webbplats och **bild** (uppladdad till Vercel Blob)
  - **Användare** — godkänn/avvisa nya konton, skapa användare manuellt, byt lösenord, hantera roller
- **MFA** — TOTP-baserad tvåfaktors­autentisering vid inloggning
- **E-post­notiser** — admin får e-post vid ny önskning, användare får e-post när bokning godkänns/avvisas
- **Aktiviteter & tips** — publik sida med filtrering per kategori (restaurang, utflykt, marknad, event, övrigt)
- **Bildgalleri** — Instagram-bilder från lägenheten

---

## Kom igång lokalt

Förutsättningar: Node.js 20+ och en PostgreSQL-databas.

```bash
git clone https://github.com/joabra/torbe.git
cd torbe
npm install --legacy-peer-deps
cp .env.example .env        # fyll i dina värden
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts      # skapar admin@torbe.se / admin123
npm run dev
```

Öppna http://localhost:3000 i webbläsaren.

---

## Miljövariabler

| Variabel | Beskrivning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `AUTH_SECRET` | Hemlig nyckel — kör `npx auth secret` lokalt |
| `NEXTAUTH_URL` | Din publika URL, t.ex. `https://torbe.vercel.app` |
| `EMAIL_HOST` | SMTP-server för e-post |
| `EMAIL_PORT` | SMTP-port (t.ex. `587`) |
| `EMAIL_USER` | SMTP-användarnamn |
| `EMAIL_PASS` | SMTP-lösenord |
| `EMAIL_FROM` | Avsändaradress, t.ex. `noreply@torbe.se` |
| `ADMIN_EMAIL` | Admin­adress som tar emot boknings­notiser |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob-token för bilduppladdning |

För bilduppladdning lokalt: hämta `BLOB_READ_WRITE_TOKEN` från Vercel Dashboard → ditt projekt → Storage → torbe-images → Token.

---

## Gratis hosting (rekommenderat)

### Databas — Neon (gratis PostgreSQL)
1. Skapa konto på https://neon.tech
2. Skapa ett nytt projekt och kopiera connection string
3. Klistra in som `DATABASE_URL` i Vercel och i `.env`

### Bildlagring — Vercel Blob
1. Gå till Vercel Dashboard → Storage → skapa ett Blob-lager
2. Länka det till projektet — Vercel injicerar `BLOB_READ_WRITE_TOKEN` automatiskt i produktion

### App-hosting — Vercel (gratis)
1. Skapa konto på https://vercel.com
2. Importera detta GitHub-repo
3. Lägg till miljövariablerna ovan i Vercel-dashboarden

---

## GitHub Actions

Workflowsen i `.github/workflows/` kräver följande Secrets i GitHub
(Settings → Secrets and variables → Actions):

| Secret | Beskrivning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (från Neon) |
| `AUTH_SECRET` | Hemlig nyckel — kör `npx auth secret` lokalt |
| `NEXTAUTH_URL` | Din publika URL, t.ex. `https://torbe.vercel.app` |
| `VERCEL_TOKEN` | API-token från vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Från `.vercel/project.json` efter `vercel link` |
| `VERCEL_PROJECT_ID` | Från `.vercel/project.json` efter `vercel link` |

Hämta Vercel IDs lokalt:
```bash
npm install -g vercel
vercel login
vercel link
cat .vercel/project.json
```

---

## Teknikstack

- **Next.js 16** — App Router, React Server Components
- **Tailwind CSS v4** — Anpassade designtokens (forest/sand)
- **Auth.js v5** — JWT-autentisering med e-post + lösenord + TOTP MFA
- **Prisma 7** — ORM med PostgreSQL-adapter
- **Neon** — Gratis serverless PostgreSQL
- **Vercel Blob** — Bildlagring för tips och aktiviteter
- **Vercel** — Gratis hosting för Next.js
- **Nodemailer** — E-post­notiser via SMTP
