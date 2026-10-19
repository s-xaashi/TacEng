# Salmaan Mukhtaar Xaashi — Portfolio & Document Marketplace

A personal portfolio and document marketplace built with **Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, Sifalo Pay, and Cloudflare R2**.

The site combines portfolio pages with a bilingual (English/Somali) marketplace where visitors can discover documents, download eligible free resources, and purchase paid documents or levels. It also includes administrative tools for managing marketplace content and related operations.

> **Project status:** This repository contains a working full-stack application. It is not the old frontend-only mockup described in earlier versions of this README. The live behavior of external services depends on the production environment configuration and the Supabase/R2/Sifalo setup.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [Supabase setup](#supabase-setup)
- [Cloudflare R2 storage](#cloudflare-r2-storage)
- [Sifalo Pay setup](#sifalo-pay-setup)
- [Marketplace behavior](#marketplace-behavior)
- [Admin and API security](#admin-and-api-security)
- [Scripts and checks](#scripts-and-checks)
- [Project layout](#project-layout)
- [Deployment on Vercel](#deployment-on-vercel)
- [Troubleshooting](#troubleshooting)
- [Contributing safely](#contributing-safely)

## Features

### Portfolio

- Personal portfolio homepage and supporting sections for projects, skills, experience, education, and contact.
- Project and portfolio content managed in the application source.
- SEO support including a sitemap and robots file.
- Vercel Analytics integration.

### Document marketplace

- Marketplace listings and document details.
- English and Somali interface strings; Somali is the default locale.
- Free downloads and paid document purchases.
- Document levels/variants with their own prices and files.
- Download availability controls and download-count tracking.
- Review-related UI and API support.
- Coupon codes for full discounts or percentage discounts, with activation dates, expiry dates, and document targeting.
- Purchase records and a post-checkout result page.

### Payments

- Sifalo Pay hosted checkout for international card/hosted payment methods supported by the merchant account.
- Local wallet checkout for supported gateways: Waafi, eDahab, and Premier Wallet.
- Server-side payment verification before a normal pending purchase is marked paid.
- Pending, successful, and failed payment states.

### File storage

- Supabase Storage support for document files.
- Cloudflare R2 support for document uploads and delivery.
- Separate private storage handling for paid files and public delivery for intended free files.
- Short-lived signed links for protected R2 and Supabase Storage downloads.
- Administrative endpoints for R2 upload URLs and file cleanup.

### Administration

- Admin pages and API endpoints for managing marketplace content and related operations.
- Server-side checks that validate a Supabase user token and confirm the user is listed in the `admins` table for the inspected administrative endpoints.

The exact pages and permissions available in a deployment depend on the code version and server/database configuration.

## Technology stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **UI:** React and Tailwind CSS
- **Database and authentication:** Supabase
- **Payments:** Sifalo Pay
- **Object storage:** Cloudflare R2 and Supabase Storage
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics

## Requirements

- Node.js compatible with the deployed Next.js version. **Node.js 20 or newer is recommended; Node.js 24.x is configured for the current Vercel project.**
- npm
- A Supabase project for marketplace data and authentication
- Sifalo Pay merchant credentials for real payments
- Cloudflare R2 credentials and buckets if R2 storage is enabled

## Run locally

1. Clone the repository and enter its directory:

   ```bash
   git clone https://github.com/s-xaashi/TacEng.git
   cd TacEng
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file from the example:

   **macOS/Linux**
   ```bash
   cp .env.example .env.local
   ```

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Fill in the environment variables required for the features you intend to run. See [Environment configuration](#environment-configuration).

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

To test on another device on the same Wi-Fi network, open the development server using your computer's local network IP address, with port `3000`.

> Some pages can render without every external integration being configured, but database, payment, admin, and file operations require their corresponding server configuration. Do not use real payment credentials for casual local testing unless you intend to make real transactions.

## Environment configuration

Use `.env.example` as the source of truth for the environment variable names. Put local values in `.env.local`; configure production values in the Vercel project's environment settings.

Never commit `.env.local`, credentials, private keys, access tokens, or actual secret values to Git.

### Supabase

| Variable | Purpose | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the browser and server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/anonymous key used by the browser client | Public; database access must still be protected by RLS |
| `SUPABASE_SECRET_KEY` | Server-side privileged Supabase client | **Secret; server only** |

The server client in `lib/supabase/admin.ts` uses `SUPABASE_SECRET_KEY`. Never rename this variable with a `NEXT_PUBLIC_` prefix or import the admin client into browser code.

### Sifalo Pay

| Variable | Purpose |
|---|---|
| `SIFALO_API_USER` | Sifalo merchant API username |
| `SIFALO_API_KEY` | Sifalo merchant API key; secret |
| `SIFALO_GATEWAY_URL` | Wallet/checkout gateway endpoint for the selected environment |
| `SIFALO_CHECKOUT_URL` | Hosted checkout URL for the same environment |

Staging and live credentials must be paired with the matching endpoints. The example file contains the current staging and live endpoint patterns. Refer to the [Sifalo Pay developer documentation](https://developer.sifalopay.com/docs/create-api-keys) and your merchant portal for credentials and account availability.

### Cloudflare R2

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Access key for private R2 operations |
| `R2_SECRET_ACCESS_KEY` | Secret key for private R2 operations |
| `R2_BUCKET_NAME` | Private document bucket |
| `R2_ENDPOINT` | Optional/configured S3-compatible endpoint |
| `R2_JURISDICTION` | Bucket jurisdiction; the example is configured for `eu` |
| `R2_PUBLIC_BUCKET_NAME` | Bucket intended for public/free document delivery |
| `R2_PUBLIC_BASE_URL` | Public base URL or CDN domain used to deliver free files |
| `R2_PUBLIC_ACCESS_KEY_ID` | Optional separate key for public-bucket operations |
| `R2_PUBLIC_SECRET_ACCESS_KEY` | Optional secret paired with the public-bucket key |

Only set up public R2 delivery if the public bucket and base URL are actually configured in Cloudflare. Public-bucket content can be accessible to anyone who has the URL; never store paid/private documents in the public bucket.

### Which variables are required?

Requirements depend on the route being used:

- Portfolio pages may not need payment or R2 credentials.
- Supabase-backed marketplace pages and APIs need the appropriate Supabase variables and database setup.
- Wallet and hosted checkout require the Sifalo credentials and matching endpoints.
- R2 upload and download routes require the appropriate private or public R2 configuration.
- Free-file uploads to public R2 require public delivery configuration, including `R2_PUBLIC_BUCKET_NAME` and `R2_PUBLIC_BASE_URL`.

An example file is a template, not proof that the corresponding service or bucket has already been provisioned.

## Supabase setup

The application uses Supabase for authentication and marketplace data. Before enabling marketplace functionality:

1. Create or select the intended Supabase project.
2. Configure the project URL, public key, and server-only secret key in the relevant environment.
3. Apply or verify the database schema and policies expected by the current application code.
4. Confirm that Row Level Security (RLS) policies are appropriate for browser-accessible tables and that privileged server access is restricted to server code.
5. Configure the expected administrator records in the `admins` table using your established admin-management process.
6. Test the relevant reads and writes with a non-production account before enabling public traffic.

The current code references marketplace data including documents, document variants, purchases, coupons and coupon-to-document assignments, reviews, and administrator records. It also calls the `increment_download_count` database function. Make sure the schema and function signature match the current source before deploying.

**Important:** This README does not ship a database migration or claim that a new Supabase project is automatically initialized. Verify the current database schema, SQL functions, grants, and RLS policies against the actual project before using a fresh database. Never disable RLS globally as a shortcut to make a page work.

## Cloudflare R2 storage

The code in `lib/r2.ts` creates signed requests for R2 operations and supports separate private and public storage configurations.

Recommended setup:

1. Create the private bucket for paid/protected documents.
2. Create and configure the public bucket only for files intended to be publicly downloadable.
3. Create narrowly scoped R2 API credentials with the required bucket access.
4. Set the matching account ID, endpoint, jurisdiction, bucket names, and keys in the environment.
5. Configure the public bucket's custom domain/CDN and set `R2_PUBLIC_BASE_URL` to its base URL.
6. Upload test files and verify both successful downloads and denied access for protected files.

Paid documents must remain in private storage and should be served through the authenticated/authorized application flow and short-lived signed URLs. A public URL is not an access-control mechanism.

The administrative R2 endpoints validate the supplied Supabase token and check the user's administrator record. Keep these operations server-side; do not expose R2 secret keys to the browser.

## Sifalo Pay setup

The payment integration is implemented in `lib/sifalo/client.ts` and the checkout API routes.

1. Obtain API credentials from the Sifalo merchant portal.
2. Select either staging or live mode and set the matching gateway and hosted-checkout URLs.
3. Configure the variables in local development or Vercel.
4. Test with the payment methods enabled for the merchant account.
5. Confirm that the application verifies the transaction server-side and handles successful, pending, and failed outcomes.
6. Before enabling live payments, verify the full return flow and reconciliation behavior using the provider's current documentation.

The current wallet route allows `waafi`, `edahab`, and `pbwallet`. Hosted checkout availability depends on the methods enabled by Sifalo for the merchant account. The UI displaying a method does not guarantee that the provider account is approved or configured for it.

Never collect or store a customer's wallet PIN or OTP in this application. Use the provider's intended payment approval flow.

## Marketplace behavior

### Purchases and downloads

- A normal paid purchase is created as pending before payment processing.
- A paid download request checks the purchase record and its paid status before preparing a download link.
- Protected file links are short-lived; the current download routes use a five-minute TTL for signed links.
- Free-download handling checks publication status, download availability, and the effective price before preparing a link.
- Download-count updates are tracked through the database function used by the application.

Treat purchase identifiers as sensitive: anyone who obtains an identifier accepted by a download endpoint may be able to use it if the endpoint's access rules permit it. Review the guest-checkout threat model before distributing purchase links.

### Coupons

The coupon logic is implemented in `lib/coupons.ts`. It supports full and percentage discounts, active/inactive status, start and expiry dates, and coupons assigned either to all eligible documents or specific documents.

Coupon quotes are calculated server-side from the document or variant price stored in Supabase. The checkout routes can create a zero-amount purchase record for an eligible coupon that fully discounts a paid item.

Test at least: invalid codes, inactive and expired coupons, not-yet-active coupons, coupons assigned to a different document, percentage discounts, full discounts, and disabled/unavailable products.

## Admin and API security

- Keep privileged Supabase and R2 credentials server-only.
- Do not trust a price, discount, payment result, storage key, or administrator role supplied by the browser without server-side validation.
- Preserve Row Level Security and review grants for every browser-accessible table and function.
- Keep paid files private and validate purchase eligibility before generating protected download links.
- Validate admin authorization on every privileged API route; do not assume that hiding an admin page protects its API.
- Avoid logging secrets, full credentials, payment tokens, or unnecessary personal data.
- Use separate staging and production credentials.
- Review changes to payment verification, coupons, file storage, and access checks carefully before deploying.

A successful build is not a complete security audit. Test access control, payment edge cases, and storage permissions against a safe test environment.

## Scripts and checks

Available npm scripts from `package.json`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run TypeScript's `tsc --noEmit` check |

Despite its name, the current `lint` script runs TypeScript type-checking rather than a dedicated ESLint command. Run the build and type check before submitting changes:

```bash
npm run lint
npm run build
```

Then manually test the changed feature in the browser. A successful build does not confirm that third-party credentials, database policies, payment-provider settings, or file permissions are correct.

## Project layout

The repository uses the Next.js App Router. The following are key areas (not an exhaustive listing):

```text
app/
  page.tsx                         Portfolio homepage
  marketplace/                     Marketplace pages and payment-return UI
  admin/                           Administrative pages
  api/
    checkout/hosted/               Sifalo hosted checkout
    checkout/wallet/               Local wallet checkout
    documents/download/            Paid document download
    documents/free-download/       Free document download
    admin/r2-upload-url/            Create R2 upload URLs
    admin/r2-document/              R2 file cleanup/operations
    admin/coupons/                  Coupon administration
    coupons/validate/               Coupon validation
    sitemap.ts                      Sitemap route
    robots.ts                       Robots route
components/
  marketplace/                     Marketplace UI components
data/                               Portfolio/static data where used
lib/
  coupons.ts                        Server-side coupon rules
  r2.ts                             Cloudflare R2 helpers
  sifalo/
    client.ts                       Sifalo API integration
    purchases.ts                    Purchase and verification logic
  supabase/
    admin.ts                        Server-only privileged client
    client.ts                       Browser Supabase client
public/                              Static assets
.env.example                         Environment-variable template
next.config.js                       Next.js configuration
package.json                         Dependencies and scripts
```

Some directories contain additional routes and components beyond those shown above. Use the source tree as the authoritative list.

## Deployment on Vercel

The GitHub repository is [`s-xaashi/TacEng`](https://github.com/s-xaashi/TacEng). The connected Vercel project is `salmaan-portfolio`.

For a typical deployment:

1. Connect the repository to the intended Vercel project.
2. Set the production branch to the branch you intend to release (currently `main`).
3. Add the required environment variables in the correct Vercel environments (Development, Preview, and/or Production).
4. Deploy and inspect the build logs.
5. Test the deployed site's homepage, marketplace, checkout return page, free downloads, paid downloads, and admin access.
6. Check Vercel runtime logs and the Supabase/R2/Sifalo dashboards if any server-side operation fails.

Environment-variable changes generally require a new deployment to take effect. Preview deployments should use test credentials and non-production data where possible. Do not assume a green deployment proves all external integrations work.

## Troubleshooting

### Supabase configuration error

Check that the Supabase URL and required public/server key are configured for the correct environment. Ensure the secret key is available only to server-side code.

### Sifalo checkout cannot start

Check that `SIFALO_API_USER`, `SIFALO_API_KEY`, `SIFALO_GATEWAY_URL`, and `SIFALO_CHECKOUT_URL` are set and belong to the same staging/live environment. Confirm that the payment method is enabled on the merchant account and inspect server logs without exposing credentials.

### R2 upload or download fails

Verify the account ID, bucket name, endpoint, jurisdiction, key permissions, and public base URL. Confirm that public files are intentionally public and paid files are in private storage. If a bucket is in a jurisdiction-specific region, the endpoint must match that jurisdiction.

### Free or paid download is denied

Check the document's published and download-enabled status, its effective price and selected variant, its file path/storage mode, and (for paid downloads) the purchase's server-side status. Do not work around an authorization error by making a paid file public.

### TypeScript check fails

Run `npm run lint` to get the type-check output. Check that translation keys exist in both language dictionaries when a component uses them, and verify that component prop types match their callers.

## Contributing safely

Before changing code:

1. Inspect the existing implementation and callers before editing.
2. Keep changes scoped to the task and avoid unrelated refactors.
3. Run `npm run lint` and `npm run build`.
4. Test the affected user flow and the relevant error states.
5. Review the diff to confirm no credentials, generated files, or unrelated changes are included.

For payment, coupon, download, authentication, and storage changes, test both the expected success path and unauthorized/invalid cases before releasing.

## Useful links

- [GitHub repository](https://github.com/s-xaashi/TacEng)
- [Vercel dashboard](https://vercel.com/dashboard)
- [Supabase documentation](https://supabase.com/docs)
- [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
- [Sifalo Pay developer documentation](https://developer.sifalopay.com/docs/create-api-keys)
