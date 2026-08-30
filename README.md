# 1corehub

One hub for your whole business — courses, a community feed, CRM, marketing
automation, services checkout, events and gamification, for coaches and
creators.

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Postgres, auth, storage, edge functions)
- Cloudflare Workers (hosting **and** edge-rendered social share previews)

## Getting started

Requires Node.js and npm.

```sh
# 1. Clone the repository.
git clone <YOUR_GIT_URL>

# 2. Enter the project directory.
cd 1corehub

# 3. Install dependencies.
npm install

# 4. Create your local environment file.
cp .env.example .env
#    Then fill in the Supabase values — see .env.example for where to find them.

# 5. Start the dev server.
npm run dev
```

Without a `.env`, the app renders a blank page: the Supabase client is created at
import time and throws before React mounts. `.env.example` documents the
required variables.

`npm run dev` serves the React app only. To exercise the Cloudflare Worker —
share previews, `sitemap.xml`, `robots.txt` — build first and run Wrangler:

```sh
npm run build && npx wrangler dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Build using development mode |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Typecheck the app and the Worker |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run brand:assets` | Re-render the favicon, PWA icons and share card |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Link sharing

Paste a `1corehub` link into WhatsApp, X, Instagram DMs, Facebook, LinkedIn,
Telegram, Slack or iMessage and it unfurls with the product's own title,
description, price and image — the way a retail product link does.

That does not happen by itself. Social crawlers do not run JavaScript, so a
single-page app serves every one of them the same empty shell. The Cloudflare
Worker in [`worker/`](worker/) closes the gap:

| Piece | What it does |
| --- | --- |
| [`src/lib/seo.ts`](src/lib/seo.ts) | Builds one `PageMeta` per entity — Open Graph, Twitter cards, and schema.org JSON-LD (`Product` + `Offer`, `Course`, `Event`). Isomorphic and pure. |
| [`worker/index.ts`](worker/index.ts) | Rewrites `<head>` at the edge with `HTMLRewriter` before the response leaves Cloudflare. Also serves `/sitemap.xml` and `/robots.txt`. |
| [`worker/share.ts`](worker/share.ts) | Route matching and the Supabase reads behind a preview. |
| [`src/hooks/useSeo.ts`](src/hooks/useSeo.ts) | Applies the same tags in the browser, for the tab title and for crawlers that do render. |
| [`src/components/share/ShareDialog.tsx`](src/components/share/ShareDialog.tsx) | The share sheet, with a live preview of the card the recipient will see. |

Routes with a real preview:

- `/checkout/:idOrSlug` — a service, as a priced `Product` with its cover image
- `/workshop/:slug` — a landing page, as a dated online `Event`
- `/course-player/:id` — a published `Course`

Everything else falls back to the branded card at `public/og-default.png`. So
does any preview that cannot be built — an unknown slug, a row row-level
security will not release, a Supabase outage. A share preview never breaks a
page.

### Requirements

1. **`share-config.json`.** The Worker queries Supabase with the same
   browser-safe URL and anon key the bundle uses. `vite.config.ts` writes them
   into `dist/share-config.json` at build time, so there is no second set of
   deploy secrets to keep in sync. The deploy workflow fails if it comes out
   empty. Every read is still governed by row-level security.
2. **The `20260828170000_public_share_access` migration.** Without it, anon
   cannot read `services`, so a logged-out visitor following a shared checkout
   link sees "Service Not Found" and every preview falls back to the default
   card. Apply it with `npx supabase db push`.

### Changing the artwork

`public/og-default.png`, the favicon and the PWA icons are all rendered from the
SVG sources in [`scripts/generate-brand-assets.mjs`](scripts/generate-brand-assets.mjs).
Edit the mark or the palette there and run `npm run brand:assets`; the outputs
are committed, so a normal build never re-renders them.

### Verifying a preview

Deploy, then paste the URL into a validator:

- WhatsApp, Slack, iMessage: paste the link into a chat with yourself
- Facebook: <https://developers.facebook.com/tools/debug/>
- X: <https://cards-dev.twitter.com/validator>
- LinkedIn: <https://www.linkedin.com/post-inspector/>
- Rich results: <https://search.google.com/test/rich-results>

The image should be at least 600x315 and ideally 1200x630. A coach uploading a
tall or tiny cover will get a small-thumbnail card rather than the full-width
one — that is the crawler's rule, not something the site can override.

## Deployment

Pushes to `main` build and deploy to Cloudflare Workers via
`.github/workflows/deploy.yml`. The workflow needs these repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

To deploy by hand, run `npm run deploy` with Wrangler authenticated.

## Custom domain

Add the domain to the Worker in the Cloudflare dashboard under
Workers & Pages → your worker → Settings → Domains & Routes, then point the DNS
record at it. Update `supabase/config.toml` and the Supabase dashboard
(Authentication → URL Configuration) to match, or magic links and OTP redirects
will keep pointing at the old host.

## Edge functions

AI features run as Supabase edge functions in `supabase/functions/` and call the
OpenAI API. Set the key as a Supabase secret before using them:

```sh
npx supabase secrets set --project-ref <PROJECT_REF> OPENAI_API_KEY=<your key>
```

## Payments

Each coach connects their own gateway under **Settings → Payments**, so money
goes to them directly and the platform never holds credentials centrally.
Razorpay and Instamojo are supported.

Credentials are write-only: the browser may save a key or secret and may ask
whether one is set, but the values are never readable back. The edge functions
read them with the service role.

### How a purchase completes

Two independent things can complete a purchase, and either is enough:

1. **The buyer's browser**, on its way back from the gateway — the fast path.
2. **The gateway's webhook**, posted server-to-server — the reliable one.

Both go through the same fulfilment code, and whichever arrives first does the
work; the other becomes a no-op. That matters because the browser path is
fragile: a closed tab, a dead battery or a bank page that never redirects would
otherwise leave the money captured and the buyer with nothing.

### Setting up webhooks

Until this is done for a coach, only the browser path works for them.

**Razorpay** — in the Razorpay dashboard, *Settings → Webhooks → Add New
Webhook*:

- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook`
- Secret: any strong string. Paste the same value into **Webhook Secret** on
  the Payments settings page — Razorpay signs with it and the function checks
  the signature against it.
- Events: `payment.captured`, `order.paid`, `payment.failed`,
  `refund.processed`.

**Instamojo** — the webhook URL is registered automatically on every payment
request, so only the signing secret needs setting. Copy the **Private Salt**
from *Instamojo → Settings → Advanced* into **Private Salt** on the Payments
settings page.

The settings page shows the URL to copy and warns while signing is unset.

### Deploying the functions

```sh
npx supabase functions deploy create-payment-order verify-payment payment-webhook \
  --project-ref <PROJECT_REF>
```

`payment-webhook` runs with `verify_jwt = false` (set in `supabase/config.toml`)
because gateways cannot present a Supabase JWT. It is not unauthenticated: it
verifies the gateway's own signature, and a request that fails that check is
rejected.

### Buying without an account

A checkout link is public, so the buyer is not asked to sign up first — that
would mean inventing an account on a page they have no reason to trust yet,
before they have parted with anything. Instead they give a name, an email and a
phone number, all three required, and the account is created for them **after**
the gateway confirms the payment.

Creating it only on a confirmed payment is the point: an endpoint that makes a
user on request is an open door for filling the auth table with junk. Someone
buying again, or buying while signed out of an account they already have, is
matched to that account by email rather than getting a second one.

Free services still ask for a sign-in, because the row that grants access is
written by the browser and RLS has to know whose it is.

### What goes out after a payment

| Email | Who gets it | When |
| --- | --- | --- |
| `account_created` | Buyer | Only when checkout just made their account. Carries the sign-in details. |
| `service_purchase_confirmed` | Buyer | Every purchase — the order confirmation. |
| `payment_receipt` | Buyer | Every purchase — the money receipt. |
| `sale_notification` | Coach, plus every `admin` and `super_admin` | Every purchase. |

All four are ordinary templates: edit them under Settings → Email, or switch
one off with `is_active` if it is more mail than you want. Links in them are
built from the origin the buyer checked out on, so a coach on a white-label
domain never receives a link to the platform's own hostname.

Templates live in `src/lib/emailTemplates.ts`. To seed a new one, add it there
and generate the SQL rather than hand-writing it:

```sh
node scripts/generate-template-seed.mjs <template_key> >> supabase/migrations/<new>.sql
```

### What is deliberately not handled

- **Subscriptions.** `services.enable_subscription` renders a per-interval
  price, but checkout charges it as a single payment. Recurring billing needs
  Razorpay Subscriptions and is not implemented.
- **Coupons.** The coupon box on checkout does not apply a discount yet.
- **Password delivery.** A new buyer's temporary password is emailed in the
  clear, which is what makes it usable without a second round trip. Switching
  to a set-password link instead is a change to `account_created` and to
  `resolveBuyer` in `supabase/functions/_shared/payments.ts`.
