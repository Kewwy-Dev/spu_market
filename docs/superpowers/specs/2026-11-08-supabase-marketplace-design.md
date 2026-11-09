# Supabase Marketplace Design

## Intent

Connect the existing SPU Market React/Vite app to the Supabase project and provide a repeatable schema setup with sample data based on the supplied data diagram.

## Current state

The app currently uses mock product/category/location data, simulated login/register flows, and localStorage for seller products. It has no Supabase client dependency. The provided publishable key can be used by a browser client, but cannot create tables or run SQL against the project.

## Goals

- Add a Supabase SQL migration for profiles, categories, pickup locations, products, product images, favorites, conversations, messages, and cart items.
- Use Supabase Auth for credentials; never store passwords in the profile table.
- Add row-level security policies for user-owned data and public product/category/location reads.
- Add idempotent sample categories, locations, and demo listings that can be run from the Supabase SQL Editor.
- Connect the app's authentication and product feed/create flows to Supabase.
- Keep keys in ignored local environment configuration and provide a safe example env file.

## Non-goals

- Upload product images to Supabase Storage in this change; image rows store URLs and sample listings use remote URLs.
- Rebuild the existing cart, favorites, and chat screens around the new tables in this pass. Their tables and policies will be ready for later UI integration.
- Provision or alter the remote Supabase project directly. The supplied publishable key does not grant SQL administration access; the migration and seed must be run in the project's SQL Editor.

## Approaches

1. **Migration plus focused app integration (selected):** version SQL locally, seed reusable reference/demo data, and connect auth and the product feed/create flow. This works with the available publishable key and gives a reviewable setup path.
2. **Remote setup through admin access:** apply schema directly with Supabase CLI or management credentials. This needs credentials/access that were not supplied and is not available through the publishable key.
3. **Client-only CRUD for all screens:** wire every marketplace flow at once. This would expand the change across several unfinished mock flows and is harder to validate as a first database connection.

## Data design

- `profiles.id` references `auth.users.id`; profile fields include student ID, display name, role, verification flag, optional private student-card URL, and timestamps. Email remains sourced from Auth and is not duplicated as a credential.
- `products` references profiles, categories, and pickup locations. `product_images` stores ordered image URLs separately.
- `favorites` and `cart_items` have one row per user/product pair.
- `conversations` identifies a product and its buyer/seller pair; `messages` references a conversation and sender.
- RLS allows public reads for active listings and reference tables, while writes are scoped to the authenticated owner/participant.
- Demo product rows use a nullable seller reference so SQL seeding does not create fake Auth users. Real listings require an authenticated profile.

## Implementation calls

- Use `@supabase/supabase-js` and Vite variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Registration adds a password field because the existing registration form had no credential for Supabase password sign-up. Student-card uploads are left out rather than requesting a sensitive image without private Storage configured; `student_card_url` is reserved in the profile schema.
- Store supplied local configuration in `.env.local` (ignored by git) and commit only `.env.example` with placeholders.
- Provide one migration and an idempotent seed section/file for the Supabase SQL Editor.
- Connect sign-up/sign-in/session restoration/sign-out and product list/create. Existing UI mock fields will be mapped to database columns.
- Do not print the provided key in logs or documentation.

## Remaining builder decisions

- Set practical schema constraints, indexes, and policy details consistent with these ownership rules.
- Map existing demo products to sample rows without relying on fake authenticated accounts.
- Surface connection and CRUD errors in the existing UI.
