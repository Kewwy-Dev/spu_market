-- Safe to run repeatedly after the migration.
begin;

insert into public.categories (id, slug, category_name) values
  ('10000000-0000-4000-8000-000000000001', 'books', 'Books and study notes'),
  ('10000000-0000-4000-8000-000000000002', 'uniform', 'Uniforms and clothing'),
  ('10000000-0000-4000-8000-000000000003', 'it', 'IT and electronics'),
  ('10000000-0000-4000-8000-000000000004', 'stationery', 'Stationery and art supplies'),
  ('10000000-0000-4000-8000-000000000005', 'dorm', 'Dorm and everyday items')
on conflict (slug) do update set category_name = excluded.category_name;

insert into public.pickup_locations (id, slug, location_name, is_popular) values
  ('20000000-0000-4000-8000-000000000001', 'b11', 'Building 11', true),
  ('20000000-0000-4000-8000-000000000002', 'b9', 'Building 9', false),
  ('20000000-0000-4000-8000-000000000003', 'b1', 'Building 1', false),
  ('20000000-0000-4000-8000-000000000004', 'canteen', 'SPU Central Canteen', true)
on conflict (slug) do update set location_name = excluded.location_name, is_popular = excluded.is_popular;

insert into public.products (id, seller_id, category_id, location_id, title, description, price, condition_tag, delivery_type, status)
select v.id, null, c.id, l.id, v.title, v.description, v.price, v.condition_tag, v.delivery_type, 'active'
from (values
  ('30000000-0000-4000-8000-000000000001'::uuid, 'iPad Air 5 64GB', 'Demo listing. Good condition with charger included.', 14500::numeric, 'Good condition', 'pickup', 'it', 'b11'),
  ('30000000-0000-4000-8000-000000000002'::uuid, 'ENG101 Study Notes', 'Complete study notes for the course.', 89::numeric, 'Excellent condition', 'digital', 'books', 'b11'),
  ('30000000-0000-4000-8000-000000000003'::uuid, 'SPU Student Jacket', 'Student jacket in very good condition.', 180::numeric, 'Very good', 'pickup', 'uniform', 'canteen'),
  ('30000000-0000-4000-8000-000000000004'::uuid, 'Wireless Mouse', 'Wireless mouse, works well.', 420::numeric, 'Good condition', 'pickup', 'it', 'b9'),
  ('30000000-0000-4000-8000-000000000005'::uuid, 'A3 Drawing Set', 'Wooden drawing tools and A3 board.', 290::numeric, 'Used twice', 'pickup', 'stationery', 'b1'),
  ('30000000-0000-4000-8000-000000000006'::uuid, 'Portable Neck Fan', 'Portable fan with rechargeable battery.', 199::numeric, 'Good condition', 'pickup', 'dorm', 'b11')
) as v(id, title, description, price, condition_tag, delivery_type, category_slug, location_slug)
join public.categories c on c.slug = v.category_slug
join public.pickup_locations l on l.slug = v.location_slug
on conflict (id) do update set
  category_id = excluded.category_id,
  location_id = excluded.location_id,
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  condition_tag = excluded.condition_tag,
  delivery_type = excluded.delivery_type,
  status = excluded.status;

insert into public.product_images (product_id, image_url, display_order) values
  ('30000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80', 0),
  ('30000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80', 0),
  ('30000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80', 0),
  ('30000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80', 0),
  ('30000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80', 0),
  ('30000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80', 0)
on conflict (product_id, display_order) do update set image_url = excluded.image_url;

commit;
