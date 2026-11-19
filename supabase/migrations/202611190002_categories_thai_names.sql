-- Update category names to Thai directly in the categories table
UPDATE public.categories SET category_name = 'หนังสือและชีทเรียน' WHERE slug = 'books';
UPDATE public.categories SET category_name = 'เครื่องแบบและเสื้อผ้า' WHERE slug = 'uniform';
UPDATE public.categories SET category_name = 'ไอทีและอิเล็กทรอนิกส์' WHERE slug = 'it';
UPDATE public.categories SET category_name = 'เครื่องเขียนและอุปกรณ์ศิลปะ' WHERE slug = 'stationery';
UPDATE public.categories SET category_name = 'ของใช้หอพักและของใช้ทั่วไป' WHERE slug = 'dorm';
