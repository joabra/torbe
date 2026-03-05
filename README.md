# Torbe — Familjens semesterbokningssida

En bokningssajt för Torbe-familjens lägenhet i Spanien. Byggd med Next.js, Prisma och PostgreSQL.

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

## Gratis hosting (rekommenderat)

### Databas — Neon (gratis PostgreSQL)
1. Skapa konto på https://neon.tech
2. Skapa ett nytt projekt och kopiera connection string
3. Klistra in som `DATABASE_URL` i Vercel och i `.env`

### App-hosting — Vercel (gratis)
1. Skapa konto på https://vercel.com
2. Importera detta GitHub-repo
3. Lägg till miljövariablerna nedan i Vercel-dashboarden

---

## GitHub Actions

Workflowsen i `.github/workflows/` kräver följande Secrets i GitHub
(Settings → Secrets and variables → Actions):

| Secret | Beskrivning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (från Neon) |
| `NEXTAUTH_SECRET` | Hemlig nyckel — kör `npx auth secret` lokalt |
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
- **Auth.js v5** — JWT-autentisering med e-post + lösenord
- **Prisma 7** — ORM med PostgreSQL-adapter
- **Neon** — Gratis serverless PostgreSQL
- **Vercel** — Gratis hosting för Next.js
