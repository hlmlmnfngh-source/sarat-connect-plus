# Speeds — Arabic Freelance Marketplace

Speeds (سرعات) is an Arabic-first freelance marketplace codebase built with React, TypeScript, TanStack Start, Vite, Supabase, and Vercel.

> **Sale status:** This repository contains a developed marketplace codebase and deployment configuration. It is not represented as a verified revenue-generating business. Before a buyer launches it commercially, complete the handover checklist in [docs/SALE_HANDOVER.md](docs/SALE_HANDOVER.md), replace owner-specific integrations/credentials, and run end-to-end acceptance tests.

## Live demo
- Production: https://sarat-connect-plus.vercel.app
- Source: https://github.com/hlmlmnfngh-source/sarat-connect-plus

The live demo may contain unfinished or unverified flows. Do not treat it as proof that every payment, identity-verification, email, or withdrawal path passed production acceptance testing.

## Product scope
- Arabic marketplace browsing and service details
- Email/password and Google authentication
- Buyer/seller onboarding and seller verification workflow
- Favorites, profiles, orders, delivery, revisions, and reviews
- Wallet balances, ledger/transactions, and withdrawal requests
- Supabase schema, row-level security policies, and Edge Functions
- Stripe checkout/webhook integration points
- Vercel configuration and GitHub Actions build/security workflows

These are implemented code paths, not a guarantee every third-party integration has been tested end-to-end.

## Technology
React + TypeScript; TanStack Start / Vite; Supabase Auth, PostgreSQL, Storage, Edge Functions; Vercel; Bun and GitHub Actions.

## Local development
1. Install Bun.
2. Clone this repository.
3. Install dependencies with `bun install`.
4. Copy `.env.example` to `.env` and fill the required values.
5. Start with `bun run dev`.
6. Verify with `bun run build`.

Never commit real secrets, service-role keys, Stripe secret keys, OAuth client secrets, or production database credentials.

## Environment and services
The project uses Supabase and Vercel. Depending on enabled features, Google OAuth and Stripe configuration may also be required. See `.env.example` and [docs/SALE_HANDOVER.md](docs/SALE_HANDOVER.md). The buyer should create their own accounts/projects and rotate all credentials. This repository transfer does not automatically transfer any third-party accounts, domains, or data.

## Release checks
A green CI run does not replace manual production acceptance testing. Verify authentication, RLS, uploads, checkout/webhooks, refunds, order completion, wallet accounting, and withdrawals using test accounts and Stripe test mode.

## Sale and handover
See [docs/SALE_HANDOVER.md](docs/SALE_HANDOVER.md) for scope, exclusions, handover plan, acceptance checklist, and buyer-facing listing copy.