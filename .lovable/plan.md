The uploaded spec has 21 feature areas — too much to ship in one turn without turning into an unreviewable dump. I'll ship it in focused phases, each independently testable. You approve; I execute one phase per turn.

## Phase 1 — Navigation + Category routes (fix landing, wire real routes)
- Replace every `to="/auth"` placeholder on Landing with real destinations.
- Create 10 category routes `/services/{slug}` (programming, design, marketing, writing, audio, video, business, translation, data, ai) — server-loaded from DB with filter sidebar (price, delivery time, seller rating, seller level) and sort.
- `/services` index (all services, search query param).
- `/services/$category/$id` service detail with packages, reviews, similar services, commission preview, "اطلب الآن".
- `/projects` list + `/projects/$id` detail.

## Phase 2 — Role selection + onboarding
- DB: add `role` ('buyer'|'seller'), `interests`, `specialty`, `bio`, `is_verified`, `last_seen` to profiles; add `portfolio_samples` table (title, description, image_url).
- After signup: role choice screen (buyer 🛒 / seller 💼).
- Buyer flow: interest picker → redirect to filtered services.
- Seller flow: 3-step wizard (specialty → 4 portfolio samples w/ 500-word counter + 1700×970 image upload → bio w/ 500-word counter + real-name-in-bio warning).
- Storage bucket for portfolio + service cover images with 1700×970 client-side validation.

## Phase 3 — Checkout, commission, coupons
- 20% platform commission calc + breakdown UI.
- `coupons` table + admin CRUD + checkout redemption.
- `/settings/payment` — saved methods (Stripe card via SetupIntent, IBAN, PayPal email), set default.
- `/checkout/:serviceId` with commission breakdown, coupon field, method selection, Stripe checkout.
- Update `stripe-webhook` to persist commission split and coupon usage.

## Phase 4 — Orders, proposals, projects
- `/post-project` 4-step wizard w/ draft autosave.
- Proposal submit + accept (accept → auto-create order).
- `/orders` timeline (ordered → in_progress → delivered → completed), buyer/seller actions, revision & dispute.
- Auto-release payment on buyer confirm.

## Phase 5 — Reviews, wishlist, notifications, verified badge, last seen
- Reviews (1–5 + text, one per order) with average + breakdown on seller/service.
- `saved_services` table + heart toggle + `/profile/saved`.
- `/notifications` page + header bell w/ unread count (uses existing realtime `user:{uid}` channel).
- `is_verified` gold badge rendering.
- `last_seen` update on auth/action + humanized display.

## Phase 6 — Admin dashboard + support
- `admin` role gated `/admin` — stats, users (ban/verify), services (approve/reject), disputes, coupon CRUD, monthly commission chart.
- `/support` — contact form (stores to `support_tickets`), WhatsApp/email, FAQ accordion.

## Technical notes
- All routes RTL Arabic, existing design tokens (navy/orange).
- Server data via TanStack Query + `createServerFn` where auth is needed; category listings via public loader with anon publishable client.
- All new tables ship with GRANTs + RLS in the same migration; role check via `has_role(auth.uid(), 'admin')`.
- Image validation client-side (natural width/height ≥ 1700×970) before upload to Storage.

## Deliverable this turn
If you approve, I start **Phase 1** immediately (navigation + category/service/project routes) — it's the biggest visible unlock and required by every later phase. Reply "go" or tell me which phase to start with.