-- Update pickup location names to Thai directly in the pickup_locations table
UPDATE public.pickup_locations SET location_name = 'ตึก 11 (ตึกกิจกรรม)' WHERE slug = 'b11';
UPDATE public.pickup_locations SET location_name = 'อาคาร 9 (สุขสำราญ)' WHERE slug = 'b9';
UPDATE public.pickup_locations SET location_name = 'อาคาร 1 (ตึกดำ)' WHERE slug = 'b1';
UPDATE public.pickup_locations SET location_name = 'โรงอาหารกลาง SPU' WHERE slug = 'canteen';
