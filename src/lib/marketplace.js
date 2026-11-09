import { getSupabaseConfigError, supabase } from './supabase';

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PRODUCT_IMAGE_PATH_MARKER = '/storage/v1/object/public/product-images/';

function requireSupabase() {
  if (!supabase) throw new Error(getSupabaseConfigError());
  return supabase;
}

function mapProduct(row) {
  const images = row.images?.length
    ? row.images.map((image) => typeof image === 'string' ? image : image.image_url).filter(Boolean)
    : row.image_url ? [row.image_url] : [];
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    description: row.description || '',
    image: images[0] || '',
    images,
    location: row.location_name,
    building: row.location_name,
    category: row.category_slug,
    locationSlug: row.location_slug,
    seller: row.seller_name || 'SPU Market Demo Seller',
    verified: Boolean(row.seller_verified),
    tag: row.condition_tag || 'New listing',
    tagColor: 'pink',
    timeAgo: new Date(row.created_at).toLocaleDateString('th-TH'),
    createdAt: row.created_at,
    sellerId: row.seller_id,
    status: row.status,
    trashedAt: row.trashed_at || null,
    statusBeforeTrash: row.status_before_trash || null,
  };
}

function getImageInputUrls(input) {
  if (Array.isArray(input.imageUrls)) return input.imageUrls.filter(Boolean);
  return input.imageUrl ? [input.imageUrl] : [];
}

function getStoragePath(imageUrl) {
  try {
    const pathname = new URL(imageUrl).pathname;
    const markerIndex = pathname.indexOf(PRODUCT_IMAGE_PATH_MARKER);
    return markerIndex === -1 ? null : decodeURIComponent(pathname.slice(markerIndex + PRODUCT_IMAGE_PATH_MARKER.length));
  } catch {
    return null;
  }
}

async function removeUploadedImagePaths(paths) {
  if (!paths.length) return;
  const client = requireSupabase();
  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  if (error) console.warn('Could not remove unused product images:', error.message);
}

async function uploadProductImages(files = [], user) {
  if (!files.length) return [];
  const client = requireSupabase();
  const uploaded = [];
  try {
    for (const file of files) {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(data.path).data.publicUrl);
    }
    return uploaded;
  } catch (error) {
    await removeUploadedImagePaths(uploaded.map(getStoragePath).filter(Boolean));
    throw error;
  }
}

async function removeStoredProductImages(imageUrls = []) {
  const paths = [...new Set(imageUrls.map(getStoragePath).filter(Boolean))];
  await removeUploadedImagePaths(paths);
}

export async function getCurrentProfile(user) {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('id,student_id,display_name,faculty,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id').eq('id', user.id).single();
  if (error) throw error;
  return data;
}

export async function completeSellerRegistration(input) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('complete_seller_registration', {
    p_student_id: input.studentId,
    p_display_name: input.displayName,
    p_faculty: input.faculty,
    p_contact: input.contact,
    p_member_type: input.memberType,
    p_identity_check_consent: input.identityCheckConsent,
    p_terms_accepted: input.termsAccepted,
  });
  if (error) throw error;
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) throw new Error('Seller registration was verified, but the profile could not be loaded.');
  return profile;
}

export async function listProducts({ sellerId } = {}) {
  const client = requireSupabase();
  let query = client.from('marketplace_products').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (sellerId) query = query.eq('seller_id', sellerId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return [];
  const { data: imageRows, error: imageError } = await client.from('product_images').select('product_id,image_url,display_order').in('product_id', rows.map((row) => row.id)).order('display_order');
  if (imageError) throw imageError;
  const imagesByProduct = new Map();
  (imageRows || []).forEach((image) => imagesByProduct.set(image.product_id, [...(imagesByProduct.get(image.product_id) || []), image.image_url]));
  return rows.map((row) => mapProduct({ ...row, images: imagesByProduct.get(row.id) || (row.image_url ? [row.image_url] : []) }));
}

export async function listSellerProducts(sellerId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select('id,title,description,price,condition_tag,delivery_type,status,status_before_trash,trashed_at,created_at,updated_at,seller_id,categories(slug,category_name),pickup_locations(slug,location_name),product_images(image_url,display_order)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    ...mapProduct({
      ...row,
      image_url: row.product_images?.slice().sort((a, b) => a.display_order - b.display_order)[0]?.image_url,
      images: row.product_images?.slice().sort((a, b) => a.display_order - b.display_order).map((image) => image.image_url),
      category_slug: row.categories?.slug,
      category_name: row.categories?.category_name,
      location_slug: row.pickup_locations?.slug,
      location_name: row.pickup_locations?.location_name,
    }),
      conditionTag: row.condition_tag || 'used',
    deliveryType: row.delivery_type || 'pickup',
    status: row.status,
    description: row.description || '',
    updatedAt: row.updated_at,
      categoryName: row.categories?.category_name || row.categories?.slug || '',
  }));
}

export async function listSellerReviewSummary(sellerId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('seller_reviews')
    .select('rating')
    .eq('seller_id', sellerId);
  if (error) throw error;
  const reviews = data || [];
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    : null;
  return { average, count: reviews.length };
}

export async function listPickupLocations() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('pickup_locations')
    .select('id,slug,location_name,is_popular')
    .order('is_popular', { ascending: false })
    .order('location_name');
  if (error) throw error;
  return (data || []).map((location) => ({
    id: location.slug,
    name: location.location_name,
    isPopular: location.is_popular,
  }));
}

export async function listCategories() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .select('id,slug,category_name')
    .order('category_name');
  if (error) throw error;
  return (data || []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.category_name,
  }));
}

export async function updateProduct(productId, input, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('Sign in before editing a product.');
  const { data: previousImages, error: previousImagesError } = await client.from('product_images').select('image_url').eq('product_id', productId);
  if (previousImagesError) throw previousImagesError;
  const uploadedImageUrls = await uploadProductImages(input.imageFiles || [], user);
  const nextImageUrls = [...getImageInputUrls(input), ...uploadedImageUrls];
  if (!nextImageUrls.length || nextImageUrls.length > 5) {
    await removeStoredProductImages(uploadedImageUrls);
    throw new Error('เลือกภาพสินค้า 1 ถึง 5 ภาพ');
  }
  const [{ data: category, error: categoryError }, { data: location, error: locationError }] = await Promise.all([
    client.from('categories').select('id,slug,category_name').eq('slug', input.category).single(),
    client.from('pickup_locations').select('id,slug,location_name').eq('slug', input.location).single(),
  ]);
  if (categoryError || locationError) {
    await removeStoredProductImages(uploadedImageUrls);
    throw categoryError || locationError;
  }

  const { error } = await client.rpc('update_marketplace_product', {
    p_product_id: productId,
    p_category_id: category.id,
    p_location_id: location.id,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || '',
    p_price: Number(input.price),
    p_condition_tag: input.conditionTag?.trim() || 'used',
    p_delivery_type: input.deliveryType || 'pickup',
    p_image_urls: nextImageUrls,
    p_status: input.status || 'active',
  });
  if (error) {
    await removeStoredProductImages(uploadedImageUrls);
    throw error;
  }
  await removeStoredProductImages((previousImages || []).map((image) => image.image_url).filter((url) => !nextImageUrls.includes(url)));
  let updatedProduct;
  try {
    updatedProduct = (await listSellerProducts(user.id)).find((product) => product.id === productId);
  } catch (refreshError) {
    console.warn('Product was saved but could not be refreshed:', refreshError.message);
  }
  return updatedProduct || {
    ...input,
    id: productId,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    image: nextImageUrls[0],
    images: nextImageUrls,
    price: Number(input.price),
    category: category.slug,
    categoryName: category.category_name,
    locationSlug: location.slug,
    location: location.location_name,
    building: location.location_name,
    status: input.status || 'active',
    createdAt: input.createdAt || new Date().toISOString(),
    sellerId: user.id,
  };
}

export async function deleteProduct(productId, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('Sign in before deleting a product.');
  const { data: images, error: imagesError } = await client.from('product_images').select('image_url').eq('product_id', productId);
  if (imagesError) throw imagesError;
  const { error } = await client.from('products').delete().eq('id', productId).eq('seller_id', user.id);
  if (error) throw error;
  await removeStoredProductImages((images || []).map((image) => image.image_url));
}

export async function trashProduct(product, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('Sign in before moving a product to the trash.');
  const { data, error } = await client.rpc('trash_marketplace_product', { p_product_id: product.id });
  if (error) throw error;
  if (!data) throw new Error('ไม่พบสินค้านี้หรือสินค้าอยู่ในถังขยะแล้ว');
}

export async function restoreProduct(product, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('Sign in before restoring a product.');
  const { data, error } = await client.rpc('restore_marketplace_product', { p_product_id: product.id });
  if (error) throw error;
  if (!data) throw new Error('กู้คืนสินค้าไม่สำเร็จ สินค้าอาจหมดเวลาจัดเก็บแล้ว');
}

export async function updateSellerPickupLocation(locationSlug) {
  const client = requireSupabase();
  const { data: location, error: locationError } = await client.from('pickup_locations').select('id').eq('slug', locationSlug).single();
  if (locationError) throw locationError;
  const { error } = await client.rpc('set_seller_pickup_location', { p_location_id: location.id });
  if (error) throw error;
}

export async function getSellerPickupLocation(user) {
  const client = requireSupabase();
  if (!user?.id) return 'b11';
  const { data: profile, error: profileError } = await client.from('profiles').select('default_pickup_location_id').eq('id', user.id).single();
  if (profileError) throw profileError;
  if (!profile?.default_pickup_location_id) return 'b11';
  const { data: location, error } = await client.from('pickup_locations').select('slug').eq('id', profile.default_pickup_location_id).single();
  if (error) throw error;
  return location.slug;
}

export async function createProduct(input, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('Sign in before listing a product.');
  const uploadedImageUrls = await uploadProductImages(input.imageFiles || [], user);
  const imageUrls = [...getImageInputUrls(input), ...uploadedImageUrls];
  if (!imageUrls.length || imageUrls.length > 5) {
    await removeStoredProductImages(uploadedImageUrls);
    throw new Error('เลือกภาพสินค้า 1 ถึง 5 ภาพ');
  }

  const [{ data: category, error: categoryError }, { data: location, error: locationError }] = await Promise.all([
    client.from('categories').select('id').eq('slug', input.category).single(),
    client.from('pickup_locations').select('id').eq('slug', input.location).single(),
  ]);
  if (categoryError || locationError) {
    await removeStoredProductImages(uploadedImageUrls);
    throw categoryError || locationError;
  }

  const { data, error } = await client.rpc('create_marketplace_product_with_images', {
    p_category_id: category.id,
    p_location_id: location.id,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || '',
    p_price: Number(input.price),
    p_condition_tag: input.conditionTag?.trim() || 'used',
    p_delivery_type: input.deliveryType || 'pickup',
    p_image_urls: imageUrls,
    p_status: input.status || 'active',
  });
  if (error) {
    await removeStoredProductImages(uploadedImageUrls);
    throw error;
  }
  const productRow = Array.isArray(data) ? data[0] : data;
  if (!productRow) {
    await removeStoredProductImages(uploadedImageUrls);
    throw new Error('Product was saved, but its response could not be loaded.');
  }
  try {
    const savedProduct = (await listSellerProducts(user.id)).find((product) => product.id === productRow.id);
    if (savedProduct) return savedProduct;
  } catch (refreshError) {
    console.warn('Product was saved but could not be refreshed:', refreshError.message);
  }
  return mapProduct({
    ...productRow,
    image_url: imageUrls[0],
    images: imageUrls,
    category_slug: input.category,
    location_slug: input.location,
  });
}
