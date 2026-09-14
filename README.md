# Salmaan Mukhtaar Xaashi — Portfolio

Frontend-only prototype for a personal portfolio + document marketplace.
Built with Next.js (App Router), TypeScript, and Tailwind CSS.

**Status:** No backend yet. No Supabase, no auth, no payments, no real file
uploads. The marketplace uses mock data in `data/documents.ts` and every
button is inert by design — this stage is purely the frontend.

## Requirements

- Node.js 18.18+ (Node 20+ recommended)
- npm

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser. On your iPhone, use your
computer's local network IP instead of `localhost` (e.g. `http://192.168.x.x:3000`)
while both devices are on the same Wi-Fi.

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — production build (also type-checks the project)
- `npm run start` — run the production build locally
- `npm run lint` — run Next.js linting

## Project structure

```
app/
  page.tsx            → homepage (portfolio)
  marketplace/
    page.tsx           → /marketplace (mock document listings)
  layout.tsx
  globals.css

components/
  Navbar.tsx, Hero.tsx, About.tsx, Skills.tsx, Experience.tsx,
  Education.tsx, Projects.tsx, MarketplaceCTA.tsx, Contact.tsx,
  Footer.tsx, DocumentCard.tsx

data/
  projects.ts          → portfolio project cards (edit freely)
  documents.ts          → mock marketplace listings (edit freely)
```

## Things to personalize before going live

- Replace the placeholder image block in the About section with a real
  portrait (`components/About.tsx`).
- Replace the placeholder email in the Contact section
  (`components/Contact.tsx`).
- Replace placeholder project cards in `data/projects.ts` with real work.

## Next steps (not part of this stage)

- Connect Supabase for real data, auth, and file storage.
- Wire up the contact form to an email service or API route.
- Implement real document upload, purchase, and download flows in
  `/marketplace`.
