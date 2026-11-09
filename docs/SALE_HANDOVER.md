# Speeds — Sale and Handover Pack

## 1. Asset being offered
The offered asset is the Speeds (سرعات) marketplace software project: source code, project-specific schema/migrations and Edge Function source, deployment configuration, and documentation, subject to the seller's actual ownership rights and third-party license terms.

- Source repository: https://github.com/hlmlmnfngh-source/sarat-connect-plus
- Demo: https://sarat-connect-plus.vercel.app

The repository is public at the time this document was prepared. A buyer must be told this; repository access alone is not an exclusive sale. For exclusivity, agree on a lawful ownership transfer and ensure the code has not been licensed or sold elsewhere.

## 2. Included
- Arabic-first marketplace frontend and application routes.
- React/TypeScript/TanStack Start/Vite source.
- Supabase schema/migration files, RLS policies, and Edge Function source present in the repository.
- Buyer/seller onboarding and authentication paths.
- Service discovery, favorites, order workflow, delivery/revisions, reviews, wallet and withdrawal code paths.
- Stripe integration code paths and webhook handler source.
- Vercel configuration, GitHub Actions workflows, and environment-variable example file.
- Handover documentation.

These describe code scope, not a warranty that every feature is production-ready or passed end-to-end tests.

## 3. Not automatically included
Unless explicitly agreed in writing, the sale does not include the seller's personal GitHub, Supabase, Vercel, Google, Stripe, email-provider or other accounts; domains/trademarks/social accounts; revenue or customers; personal data or identity documents; paid subscriptions; or guaranteed revenue, traction, regulatory approval, or provider approval. Buyer should create their own provider accounts. Existing production data must not be transferred without a documented legal basis and privacy review.

## 4. Release caveat
Do not market this as a proven revenue-generating marketplace. The repository has CI build/security workflows and deployed application code, but a complete acceptance test is still required for the exact release being sold. Verify:
1. Signup/login, email confirmation, and Google OAuth.
2. Buyer/seller onboarding, profile persistence, identity uploads, and admin review.
3. Service creation, browsing, favorites, and permissions.
4. Stripe test-mode checkout and webhook signature/idempotency.
5. Order delivery, revision, resubmission, completion, and refund.
6. Wallet ledger arithmetic, fees, pending-to-available release, and withdrawals.
7. RLS and storage boundaries using separate buyer/seller/admin accounts.
8. Mobile layout, accessibility, errors, email delivery, and production deployment.

Disclose all failed or untested items to the buyer.

## 5. Safe transfer plan
1. Agree in writing on scope, price, exclusivity, payment milestones, warranties, acceptance criteria, and support period.
2. Create a clean release tag/commit and export a repository backup.
3. Remove demo users and personal/test data only after backups and dependency checks; never hand over personal identity documents.
4. Create a fresh Supabase project under the buyer's account. Apply and verify migrations; deploy Edge Functions; configure Auth redirects, Storage buckets/policies, RLS, and secrets.
5. Create a fresh Vercel project under the buyer's account and connect the repository. Configure environment variables with the buyer's Supabase URL and publishable key.
6. Configure Google OAuth and Stripe under the buyer's accounts. Use Stripe test mode until tests pass. Never share secrets in chat/email or commit them.
7. Verify email delivery and production URLs; run acceptance tests with synthetic data.
8. Transfer GitHub repository ownership according to the agreement, rotate credentials, revoke seller access, and record final handover.
9. Record commit SHA, migrations, function versions, provider settings, known issues, and support window.

Do not transfer personal provider accounts; this may violate terms and expose unrelated data.

## 6. Buyer acceptance checklist
- [ ] Clean-clone deployment works using written setup steps.
- [ ] Required environment variables are documented and no secrets are committed.
- [ ] Migrations apply to a fresh project without undocumented manual changes.
- [ ] RLS and Storage policies pass least-privilege tests.
- [ ] Auth and confirmation redirects work on buyer's domain.
- [ ] Service, order, review, wallet, and refund flows pass end-to-end tests.
- [ ] Stripe test checkout/webhook/idempotency tests pass.
- [ ] Withdrawal workflow is restricted to authorized server-side execution.
- [ ] No unauthorized personal/customer data is included.
- [ ] Known limitations, third-party costs, and maintenance are accepted in writing.

## 7. Buyer-facing listing copy
### Title
Arabic Freelance Marketplace Source Code — React, TypeScript, Supabase, Vercel

### Description
Acquire Speeds (سرعات), an Arabic-first freelance marketplace codebase with buyer/seller onboarding, service discovery, order workflow, reviews, wallet/withdrawal components, and Supabase-backed backend logic. Includes source code, database/migration assets, Edge Function source, and deployment configuration. Intended for a developer or operator who can complete provider setup and production acceptance testing.

### Required disclosure
This is a software asset sale, not a sale of a profitable business. No revenue, users, exclusivity, or production readiness is guaranteed unless independently verified and expressly included in the written agreement. Third-party accounts and recurring costs are not included by default.

## 8. Pricing guidance
Do not value the project only by development hours. Price depends on verified code quality, ownership/exclusivity, design, successful end-to-end payment tests, documentation, and actual revenue/users. With no independently verified revenue and no complete production acceptance evidence, present it as a source-code/software asset. Do not claim monthly recurring revenue or active customers without evidence.

## 9. Before publishing
- Confirm ownership of code, assets, fonts, illustrations, and dependency licenses.
- Check open-source licenses and third-party terms.
- Decide whether sale is exclusive and whether repository history is included.
- Remove secrets, test credentials, personal data, and internal notes from listing materials.
- Capture fresh screenshots/video of current build.
- Complete the acceptance checklist or prominently disclose unchecked items.
- Define post-sale support period.