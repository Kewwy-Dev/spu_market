# Supabase Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Connect SPU Market authentication and product listing flows to Supabase and provide safe, repeatable database setup SQL with sample data.

**Architecture:** The browser uses a single Supabase client configured from Vite environment variables. A SQL migration creates normalized tables, indexes, and RLS; a repeatable seed adds reference data and nullable-seller demo listings. Auth maps sessions to the app's existing user shape, while product service functions map database rows to the current card model.

**Tech Stack:** React 19, Vite, `@supabase/supabase-js`, PostgreSQL/Supabase SQL.

**Spec:** `docs/superpowers/specs/2026-11-08-supabase-marketplace-design.md`

## Global Constraints

- Passwords are handled only by Supabase Auth and never stored in `profiles`.
- The publishable key is used only in the browser; no service-role key is added.
- `.env.local` is ignored by git; `.env.example` contains placeholders only.
- Remote DDL is not run from the app; user applies SQL in Supabase SQL Editor.
- Cart, favorites, and chat schemas are created but their mock screens are outside this integration pass.

## Review Focus

- Missing Vite env values must produce a clear setup error without crashing app import.
- Auth restoration, failed login, and failed sign-up must leave app navigation and loading state usable.
- Empty products and backend read errors must not hide a usable seeded feed without an explanation.
- Creating a listing must store the authenticated seller, valid foreign keys, and image URL without localStorage persistence.
- RLS must prevent users from editing another user's profile, listing, cart, favorite, conversation, or message.

## File Structure

- `supabase/migrations/202611080001_marketplace.sql`: all schema, constraints, indexes, RLS, policies, and public read grants.
- `supabase/seed.sql`: idempotent sample categories, locations, and demo products.
- `.env.example`, `.env.local`: documented environment names and ignored local project configuration.
- `src/lib/supabase.js`: validated browser client.
- `src/lib/marketplace.js`: row mapping and product/profile persistence functions.
- `src/App.jsx`: session initialization, auth state subscription, product loading, create callback, and logout.
- `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`: real Supabase auth calls and profile metadata mapping.
- `src/pages/AddProductPage.jsx`: submit a URL-backed listing through the product service.
- `package.json`, `package-lock.json`: Supabase JS dependency.

## Tasks

### Task 1: Add database migration and sample data

**Files:**
- Create: `supabase/migrations/202611080001_marketplace.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces tables `profiles`, `categories`, `pickup_locations`, `products`, `product_images`, `favorites`, `conversations`, `messages`, and `cart_items`, plus the public projection and transactional `create_marketplace_product` RPC.
- Seed product rows have null `seller_id` and refer to seeded category/location slugs.

- [x] Create UUID primary keys, timestamps, foreign keys, uniqueness/check constraints, and query indexes according to the approved data design.
- [x] Add profile creation trigger on `auth.users` that maps display name, student ID, and role from auth metadata; do not expose password fields.
- [x] Enable RLS and define public reference/active-product reads plus ownership/participant-scoped writes; make demo listings publicly readable.
- [x] Insert categories, pickup locations, and sample product rows with `ON CONFLICT` behavior so seed can run repeatedly.
- [x] Review every policy for cross-user writes and verify migration/seed SQL references the same names and constraints.

### Task 2: Configure Supabase client and data service

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/supabase.js`
- Create: `src/lib/marketplace.js`
- Create: `.env.example`, `.env.local`

**Interfaces:**
- `getCurrentProfile(user): Promise<Profile>` retrieves the `profiles` row for an authenticated Supabase user.
- `listProducts(): Promise<Product[]>` returns active products ordered newest first and mapped to the card model.
- `createProduct(input, user): Promise<Product>` resolves foreign keys, calls the atomic create RPC, and returns the card model.

- [x] Add `@supabase/supabase-js`; install via lockfile update.
- [x] Initialize client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, with an actionable missing-config error.
- [x] Put the provided URL and publishable key into ignored `.env.local`; keep only placeholder values in `.env.example`.
- [x] Implement public-view row to existing product-card mapping.
- [x] Implement authenticated create with slug-to-ID lookup and one transactional product/image RPC; return actionable Supabase errors.

### Task 3: Connect authentication and session lifecycle

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/LoginPage.jsx`
- Modify: `src/pages/RegisterPage.jsx`
- Modify: `src/lib/marketplace.js`

**Interfaces:**
- `LoginPage` calls `supabase.auth.signInWithPassword` and forwards the Supabase user/profile to `onLoginSuccess`.
- `RegisterPage` calls `supabase.auth.signUp` with profile fields in `options.data`.
- `App` restores `getSession`, listens to `onAuthStateChange`, and signs out with `supabase.auth.signOut`.

- [x] Remove simulated timeout authentication and replace with Supabase password auth while retaining `@spumail.net` validation.
- [x] Make registration form submit create an Auth user and profile metadata; display email-confirmation guidance when session creation is deferred.
- [x] Restore user session on app mount and clean up auth subscription.
- [x] Load profile details and map the auth user to fields existing pages consume (`id`, `email`, `displayName`, `studentId`, `verified`).
- [x] Route logout through Supabase and show auth errors in existing form feedback.

### Task 4: Connect product feed and listing creation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/AddProductPage.jsx`
- Modify: `src/pages/HomePage.jsx` only if loading/error props are required.

**Interfaces:**
- `App` loads `listProducts()` and passes current database product list into `HomePage`.
- Add product submit accepts form fields and authenticated current user, then invokes `createProduct`.

- [x] Replace static-plus-localStorage product composition with database product loading and an explicit loading/error state.
- [x] Replace the local file picker with an image URL field and remote preview; persist the URL in `product_images` (no Storage upload in scope).
- [x] On product submission, require a Supabase session, call the transactional RPC, prepend returned product, and navigate after success; retain the form and show errors on failure.
- [x] Remove user product localStorage persistence and confirm seller dashboard receives the database-backed seller products.

### Task 5: Review and verify the integration

**Files:**
- Review all files created or modified above.

- [x] Run `npm run build` and `npm run lint`; resolve issues caused by the integration.
- [x] Inspect generated SQL for consistent table/column references, rerunnable seed inserts, and no service-role secrets.
- [x] Confirm `.env.local` is ignored and `.env.example` contains placeholders only.
- [x] Report that remote database setup requires running migration and seed in Supabase SQL Editor; do not claim they were applied remotely.

## Execution Notes

Ruling: Add a registration password field because Supabase password sign-up cannot use the old form (which had no password) - this makes account creation and subsequent sign-in coherent - no expected downside beyond one added required input. Ruling: Do not collect a student-card image until private Storage upload is available - the current publishable-key-only setup cannot safely persist sensitive images - student verification remains pending. Ruling: Use a single transactional RPC for product plus image creation after review found separate requests could leave a partial active listing - this makes the write atomic - requires the supplied migration before the app can publish listings. Tasks are sequential: the data service depends on the SQL names, and the UI depends on the data service interfaces. Build and lint are the requested verification; no test files or test commands are included.
