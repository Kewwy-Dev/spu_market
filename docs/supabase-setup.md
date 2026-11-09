# SPU Market Supabase setup

## Apply the database schema

The browser publishable key cannot run database DDL. In the Supabase Dashboard for this project:

1. Open **SQL Editor** and run `supabase/migrations/202611080001_marketplace.sql`.
2. Run `supabase/migrations/202611080002_seller_registration.sql`.
3. Run `supabase/migrations/202611080003_profile_role_enum.sql` so `profiles.role` uses a selectable enum.
4. Run `supabase/migrations/202611080004_seller_store_management.sql` for seller pickup settings.
5. Run `supabase/seed.sql` in a second query. It can be run again safely.
6. Confirm the setup with:

```sql
select slug, category_name from public.categories order by slug;
select slug, location_name from public.pickup_locations order by slug;
select count(*) as seeded_listings from public.marketplace_products;
```

The seed inserts five categories, four pickup points, and six demo listings. Demo listings have no account owner and are marked active.

## Configure the app

The local `.env.local` uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env.local` is ignored by git. Copy `.env.example` when setting up another developer machine, fill in that Supabase project's URL and publishable key, then restart Vite.

The registration page sends an email OTP and verifies it before calling `complete_seller_registration`. In Supabase Dashboard, open **Authentication → Email Templates → Magic Link**. Replace the sign-in link content that uses `{{ .ConfirmationURL }}` with a message that displays `{{ .Token }}`, then save the template. The app accepts 8 digits to match this project's **Email OTP length** setting. The database function checks the verified `@spumail.net` Auth user and a recent OTP authentication claim, saves the submitted profile fields, and assigns the `seller` role. `student_card_url` remains optional; the current registration form does not collect a student-card image. The Google sign-in button requires Google to be enabled in the project's Auth providers and redirect URLs.

Example Magic Link template body:

```html
<h2>รหัสยืนยัน SPU Market</h2>
<p>รหัส OTP ของคุณคือ <strong>{{ .Token }}</strong></p>
<p>กรอกรหัสนี้ในหน้า SPU Market เพื่อยืนยันอีเมล</p>
```

Product creation calls `create_marketplace_product`, which writes the product and its public image URL in one database transaction. Product images are saved as URLs in `product_images`; the app does not upload product images to Storage. Cart, favorites, and chat tables have RLS policies but their existing UI screens are still mock data.

## Tables

- `profiles`: Auth-linked account profile. Email remains in `auth.users`; student ID, faculty, and contact are private to the owner.
- `categories`, `pickup_locations`: public reference data.
- `products`, `product_images`: active public listings and their image URLs.
- `favorites`, `cart_items`: per-user product selections.
- `conversations`, `messages`: buyer/seller chat records.
- `marketplace_products`: safe public projection for the product feed; it omits profile contact details.
