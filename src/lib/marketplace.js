import { getSupabaseConfigError, supabase } from './supabase';

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PRODUCT_IMAGE_PATH_MARKER = '/storage/v1/object/public/product-images/';
const AVATAR_IMAGE_BUCKET = 'avatars';
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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
    location: row.location_name || DEFAULT_LOCATION_LABELS[row.location_slug] || row.location_slug || '',
    building: row.location_name || DEFAULT_LOCATION_LABELS[row.location_slug] || row.location_slug || '',
    category: row.category_slug,
    categoryName: row.category_name || DEFAULT_CATEGORY_LABELS[row.category_slug] || row.category_slug || '',
    locationSlug: row.location_slug,
    seller: row.seller_name || 'SPU Market Demo Seller',
    verified: Boolean(row.seller_verified),
    quantity: row.quantity ?? 1,
    timeAgo: new Date(row.created_at).toLocaleDateString('th-TH'),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at || null,
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

function isMissingProfileColumnError(error) {
  if (!error) return false;
  const msg = String(error.message || '');
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('avatar_url') ||
    msg.includes('major') ||
    msg.includes('line_user_id') ||
    msg.includes('line_notify_enabled')
  );
}

export async function getCurrentProfile(user) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(
      'id,student_id,display_name,faculty,major,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id,avatar_url,line_user_id,line_display_name,line_linked_at,line_notify_enabled,line_notify_categories'
    )
    .eq('id', user.id)
    .single();
  if (error && isMissingProfileColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await client
      .from('profiles')
      .select('id,student_id,display_name,faculty,major,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id,avatar_url')
      .eq('id', user.id)
      .single();
    if (fallbackError && isMissingProfileColumnError(fallbackError)) {
      const { data: legacyData, error: legacyError } = await client
        .from('profiles')
        .select('id,student_id,display_name,faculty,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id')
        .eq('id', user.id)
        .single();
      if (legacyError) throw legacyError;
      return legacyData;
    }
    if (fallbackError) throw fallbackError;
    return fallbackData;
  }
  if (error) throw error;
  return data;
}

export async function updateLineNotificationPreferences(userId, { enabled, categories }) {
  if (!userId) throw new Error('กรุณาเข้าสู่ระบบก่อนตั้งค่าการแจ้งเตือน');
  const client = requireSupabase();
  const payload = {};
  if (typeof enabled === 'boolean') {
    payload.line_notify_enabled = enabled;
  }
  if (categories && typeof categories === 'object') {
    payload.line_notify_categories = {
      chat: categories.chat !== false,
      pickup: categories.pickup !== false,
      review: categories.review !== false,
    };
  }
  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('line_user_id,line_display_name,line_linked_at,line_notify_enabled,line_notify_categories')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar(file, user) {
  if (!file) throw new Error('กรุณาเลือกรูปภาพโปรไฟล์');
  if (!user?.id) throw new Error('กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปโปรไฟล์');
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('ขนาดรูปภาพต้องไม่เกิน 5 MB');
  }

  const client = requireSupabase();
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await client.storage.from(AVATAR_IMAGE_BUCKET).upload(avatarPath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (!error && data?.path) {
    return client.storage.from(AVATAR_IMAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
  }

  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('bucket') || error?.statusCode === '404' || error?.status === 404) {
    const fallbackPath = `${user.id}/avatars/${crypto.randomUUID()}.${extension}`;
    const { data: fallbackData, error: fallbackError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(fallbackPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
    if (fallbackError) throw fallbackError;
    return client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(fallbackData.path).data.publicUrl;
  }

  throw error;
}

export async function updateUserProfile(user, input) {
  if (!user?.id) throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์');
  const client = requireSupabase();

  const displayName = String(input.displayName || '').trim();
  const faculty = String(input.faculty || '').trim();
  const major = String(input.major || '').trim();
  const contact = String(input.contact || '').trim();
  const avatarUrl = input.avatarUrl !== undefined ? String(input.avatarUrl || '').trim() : undefined;

  if (!displayName) {
    throw new Error('กรุณากรอก Display Name');
  }

  const profilePayload = {
    display_name: displayName,
    faculty: faculty || null,
    major: major || null,
    contact: contact || null,
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {}),
  };

  let updatedProfile = null;
  const { data, error } = await client
    .from('profiles')
    .update(profilePayload)
    .eq('id', user.id)
    .select('id,student_id,display_name,faculty,major,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id,avatar_url')
    .single();

  if (error && isMissingProfileColumnError(error)) {
    const { avatar_url: _omitAvatar, major: _omitMajor, ...fallbackPayload } = profilePayload;
    const { data: fallbackData, error: fallbackError } = await client
      .from('profiles')
      .update(fallbackPayload)
      .eq('id', user.id)
      .select('id,student_id,display_name,faculty,contact,student_card_url,member_type,role,is_verified,default_pickup_location_id')
      .single();
    if (fallbackError) throw fallbackError;
    updatedProfile = {
      ...fallbackData,
      major: major || '',
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {}),
    };
  } else if (error) {
    throw error;
  } else {
    updatedProfile = data;
  }

  const { error: authError } = await client.auth.updateUser({
    data: {
      display_name: displayName,
      faculty: faculty || '',
      major: major || '',
      contact: contact || '',
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || '' } : {}),
    },
  });
  if (authError) {
    console.warn('Could not sync auth user metadata:', authError.message);
  }

  return updatedProfile;
}

export async function completeSellerRegistration(input) {
  const client = requireSupabase();
  const baseArgs = {
    p_student_id: input.studentId,
    p_display_name: input.displayName,
    p_faculty: input.faculty,
    p_contact: input.contact,
    p_member_type: input.memberType,
    p_identity_check_consent: input.identityCheckConsent,
    p_terms_accepted: input.termsAccepted,
  };
  let { data, error } = await client.rpc('complete_seller_registration', {
    ...baseArgs,
    p_major: input.major || '',
  });
  if (error && (error.code === 'PGRST202' || String(error.message || '').includes('p_major'))) {
    ({ data, error } = await client.rpc('complete_seller_registration', baseArgs));
  }
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
    .select('id,title,description,price,quantity,delivery_type,status,status_before_trash,trashed_at,created_at,updated_at,seller_id,categories(slug,category_name),pickup_locations(slug,location_name),product_images(image_url,display_order)')
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
    quantity: row.quantity ?? 1,
    deliveryType: row.delivery_type || 'pickup',
    status: row.status,
    description: row.description || '',
    updatedAt: row.updated_at,
      categoryName: row.categories?.category_name || row.categories?.slug || '',
  }));
}

/**
 * คำนวณสรุปคะแนนร้านค้า:
 * - average = ผลรวมคะแนนทั้งหมด / จำนวนครั้งที่ให้คะแนน (ช่วง 1-5 ดาว)
 * - count = จำนวนรีวิว/การให้คะแนนทั้งหมด
 * - raterCount = จำนวนผู้กดให้คะแนน (นับตามผู้ซื้อที่ไม่ซ้ำกัน หรือ count หากไม่มี reviewer_id)
 */
export function computeSellerRatingSummary(reviews = []) {
  const validReviews = (reviews || []).filter((review) => {
    const score = Number(review?.rating);
    return Number.isFinite(score) && score >= 1 && score <= 5;
  });

  const count = validReviews.length;
  const totalScore = validReviews.reduce((sum, review) => sum + Number(review.rating), 0);
  const average = count > 0 ? totalScore / count : null;

  const uniqueRaters = new Set(
    validReviews.map((review) => review?.reviewer_id || review?.reviewerId).filter(Boolean),
  );
  const raterCount = uniqueRaters.size > 0 ? uniqueRaters.size : count;

  return {
    average,
    count,
    raterCount,
    totalScore,
  };
}

export async function listSellerReviewSummary(sellerId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('seller_reviews')
    .select('rating,reviewer_id')
    .eq('seller_id', sellerId);
  if (error) throw error;
  return computeSellerRatingSummary(data || []);
}

export async function getBuyerProductReview({ productId, reviewerId }) {
  if (!productId || !reviewerId) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from('seller_reviews')
    .select('id,seller_id,reviewer_id,product_id,rating,review_text,created_at')
    .eq('product_id', productId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function submitSellerReview({
  sellerId,
  reviewerId,
  productId,
  rating,
  reviewText = '',
}) {
  const client = requireSupabase();
  const numericRating = Math.round(Number(rating));
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new Error('กรุณาเลือกคะแนนระหว่าง 1 ถึง 5 ดาว');
  }
  if (!sellerId || !reviewerId || !productId) {
    throw new Error('ข้อมูลการให้คะแนนไม่ครบถ้วน');
  }
  if (sellerId === reviewerId) {
    throw new Error('ไม่สามารถให้คะแนนร้านค้าของตนเองได้');
  }

  const trimmedText = String(reviewText || '').trim().slice(0, 1000);
  const { data, error } = await client
    .from('seller_reviews')
    .insert({
      seller_id: sellerId,
      reviewer_id: reviewerId,
      product_id: productId,
      rating: numericRating,
      review_text: trimmedText,
    })
    .select('id,seller_id,reviewer_id,product_id,rating,review_text,created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('คุณได้ให้คะแนนสินค้านี้ไปแล้ว');
    }
    throw error;
  }

  return data;
}

export const DEFAULT_CATEGORY_LABELS = {
  books: 'หนังสือและชีทเรียน',
  uniform: 'เครื่องแบบและเสื้อผ้า',
  it: 'ไอทีและอิเล็กทรอนิกส์',
  stationery: 'เครื่องเขียนและอุปกรณ์ศิลปะ',
  dorm: 'ของใช้หอพักและของใช้ทั่วไป',
};

export const DEFAULT_LOCATION_LABELS = {
  b11: 'อาคาร 11',
  b9: 'อาคาร 9',
  b1: 'อาคาร 1',
  b5: 'อาคาร 5',
  b10: 'โรงอาหารเย็น',
  b7: 'โรงอาหารร้อน',
};

export const FALLBACK_CATEGORIES = [
  { id: '10000000-0000-4000-8000-000000000001', slug: 'books', name: 'หนังสือและชีทเรียน', category_name: 'หนังสือและชีทเรียน', rawName: 'หนังสือและชีทเรียน' },
  { id: '10000000-0000-4000-8000-000000000002', slug: 'uniform', name: 'เครื่องแบบและเสื้อผ้า', category_name: 'เครื่องแบบและเสื้อผ้า', rawName: 'เครื่องแบบและเสื้อผ้า' },
  { id: '10000000-0000-4000-8000-000000000003', slug: 'it', name: 'ไอทีและอิเล็กทรอนิกส์', category_name: 'ไอทีและอิเล็กทรอนิกส์', rawName: 'ไอทีและอิเล็กทรอนิกส์' },
  { id: '10000000-0000-4000-8000-000000000004', slug: 'stationery', name: 'เครื่องเขียนและอุปกรณ์ศิลปะ', category_name: 'เครื่องเขียนและอุปกรณ์ศิลปะ', rawName: 'เครื่องเขียนและอุปกรณ์ศิลปะ' },
  { id: '10000000-0000-4000-8000-000000000005', slug: 'dorm', name: 'ของใช้หอพักและของใช้ทั่วไป', category_name: 'ของใช้หอพักและของใช้ทั่วไป', rawName: 'ของใช้หอพักและของใช้ทั่วไป' },
];

export const FALLBACK_LOCATIONS = [
  { id: 'b11', slug: 'b11', locationId: '20000000-0000-4000-8000-000000000001', name: 'ตึก 11 (ตึกกิจกรรม)', location_name: 'ตึก 11 (ตึกกิจกรรม)', rawName: 'ตึก 11 (ตึกกิจกรรม)', isPopular: true },
  { id: 'b9', slug: 'b9', locationId: '20000000-0000-4000-8000-000000000002', name: 'อาคาร 9 (สุขสำราญ)', location_name: 'อาคาร 9 (สุขสำราญ)', rawName: 'อาคาร 9 (สุขสำราญ)', isPopular: false },
  { id: 'b1', slug: 'b1', locationId: '20000000-0000-4000-8000-000000000003', name: 'อาคาร 1 (ตึกดำ)', location_name: 'อาคาร 1 (ตึกดำ)', rawName: 'อาคาร 1 (ตึกดำ)', isPopular: false },
  { id: 'canteen', slug: 'canteen', locationId: '20000000-0000-4000-8000-000000000004', name: 'โรงอาหารกลาง SPU', location_name: 'โรงอาหารกลาง SPU', rawName: 'โรงอาหารกลาง SPU', isPopular: true },
];

let categoriesCache = null;
let pickupLocationsCache = null;

export async function listPickupLocations({ forceRefresh = false } = {}) {
  if (!forceRefresh && pickupLocationsCache) return pickupLocationsCache;
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('pickup_locations')
      .select('id,slug,location_name,is_popular')
      .order('is_popular', { ascending: false })
      .order('location_name');
    if (error) throw error;
    const mapped = (data || []).map((location) => ({
      id: location.slug,
      slug: location.slug,
      locationId: location.id,
      name: location.location_name || DEFAULT_LOCATION_LABELS[location.slug] || location.slug || '',
      location_name: location.location_name,
      rawName: location.location_name,
      isPopular: Boolean(location.is_popular),
    }));
    pickupLocationsCache = mapped;
    return mapped;
  } catch (error) {
    if (pickupLocationsCache) return pickupLocationsCache;
    console.warn('Could not load pickup locations from Supabase, falling back to defaults:', error.message);
    return FALLBACK_LOCATIONS;
  }
}

export async function listCategories({ forceRefresh = false } = {}) {
  if (!forceRefresh && categoriesCache) return categoriesCache;
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('categories')
      .select('id,slug,category_name,created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.category_name,
      category_name: category.category_name,
      rawName: category.category_name,
    }));
    categoriesCache = mapped;
    return mapped;
  } catch (error) {
    if (categoriesCache) return categoriesCache;
    console.warn('Could not load categories from Supabase, falling back to defaults:', error.message);
    return FALLBACK_CATEGORIES;
  }
}

export async function getMasterData({ forceRefresh = false } = {}) {
  const [categories, pickupLocations] = await Promise.all([
    listCategories({ forceRefresh }),
    listPickupLocations({ forceRefresh }),
  ]);
  return { categories, pickupLocations };
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
    p_quantity: Math.min(10, Math.max(1, Number(input.quantity) || 1)),
    p_delivery_type: 'pickup',
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
    p_quantity: Math.min(10, Math.max(1, Number(input.quantity) || 1)),
    p_delivery_type: 'pickup',
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

export async function isProductFavorited(productId, userId) {
  if (!productId || !userId) return false;
  const client = requireSupabase();
  const { data, error } = await client
    .from('favorites')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Could not check favorite status:', error.message);
    return false;
  }
  return Boolean(data);
}

export async function toggleFavoriteProduct(productId, userId) {
  if (!productId || !userId) throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
  const client = requireSupabase();
  const { data: existing, error: checkError } = await client
    .from('favorites')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    const { error: deleteError } = await client
      .from('favorites')
      .delete()
      .eq('id', existing.id);
    if (deleteError) throw deleteError;
    return { isFavorite: false };
  }

  const { error: insertError } = await client
    .from('favorites')
    .insert({ product_id: productId, user_id: userId });
  if (insertError) throw insertError;
  return { isFavorite: true };
}

export async function removeFavoriteProduct(productId, userId) {
  if (!productId || !userId) return;
  const client = requireSupabase();
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function countUserFavorites(userId) {
  if (!userId) return 0;
  const client = requireSupabase();
  const { count, error } = await client
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    console.error('Could not count favorites:', error.message);
    return 0;
  }
  return count || 0;
}

export async function listUserFavorites(userId) {
  if (!userId) return [];
  const client = requireSupabase();
  const { data: favRows, error: favError } = await client
    .from('favorites')
    .select('id, product_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (favError) throw favError;
  if (!favRows || !favRows.length) return [];

  const productIds = favRows.map((f) => f.product_id);
  const { data: productRows, error: productError } = await client
    .from('marketplace_products')
    .select('*')
    .in('id', productIds);

  if (productError) throw productError;

  const { data: imageRows, error: imageError } = await client
    .from('product_images')
    .select('product_id, image_url, display_order')
    .in('product_id', productIds)
    .order('display_order');

  if (imageError) {
    console.warn('Could not load favorite product images:', imageError.message);
  }

  const imagesByProduct = new Map();
  (imageRows || []).forEach((img) => {
    imagesByProduct.set(img.product_id, [...(imagesByProduct.get(img.product_id) || []), img.image_url]);
  });

  const productMap = new Map();
  (productRows || []).forEach((row) => {
    productMap.set(row.id, mapProduct({
      ...row,
      images: imagesByProduct.get(row.id) || (row.image_url ? [row.image_url] : []),
    }));
  });

  return favRows
    .map((fav) => {
      const prod = productMap.get(fav.product_id);
      if (!prod) return null;
      return {
        ...prod,
        favoriteId: fav.id,
        favoritedAt: fav.created_at,
      };
    })
    .filter(Boolean);
}

export async function getProductById(productId) {
  if (!productId) return null;
  const client = requireSupabase();
  const { data: row, error } = await client
    .from('marketplace_products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const { data: imageRows } = await client
    .from('product_images')
    .select('image_url, display_order')
    .eq('product_id', productId)
    .order('display_order');

  const images = (imageRows || []).map((img) => img.image_url);
  return mapProduct({
    ...row,
    images: images.length ? images : (row.image_url ? [row.image_url] : []),
  });
}

export async function updateProductStatus(productId, status, user) {
  const client = requireSupabase();
  if (!user?.id) throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
  const validStatuses = ['active', 'sold', 'draft', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error('สถานะสินค้าไม่ถูกต้อง');
  }

  // 1. Try database RPC first
  const { data: rpcData, error: rpcError } = await client.rpc('update_marketplace_product_status', {
    p_product_id: productId,
    p_status: status,
  });

  if (!rpcError && rpcData) {
    return rpcData;
  }

  // 2. Fallback to direct table update with RLS
  const { data, error } = await client
    .from('products')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('seller_id', user.id)
    .select();

  if (error) throw error;
  if (!data || !data.length) throw new Error('ไม่พบสินค้าหรือคุณไม่มีสิทธิ์แก้ไขสินค้านี้');
  return data[0];
}

export async function markProductAsSold(productId, user) {
  return updateProductStatus(productId, 'sold', user);
}

export async function listSellerTransactions(sellerId) {
  if (!sellerId) return [];
  const client = requireSupabase();

  try {
    const { data: rows, error } = await client
      .from('pickup_appointments')
      .select('id,product_id,quantity,scheduled_at,status,created_at,buyer_id,seller_id,conversation_id,seller_delivered_at,buyer_confirmed_at,cancelled_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rows || !rows.length) return [];

    const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
    const buyerIds = [...new Set(rows.map((r) => r.buyer_id).filter(Boolean))];

    const [{ data: products }, { data: images }, { data: profiles }, { data: locations }] = await Promise.all([
      productIds.length ? client.from('products').select('id,title,price,location_id,status').in('id', productIds) : { data: [] },
      productIds.length ? client.from('product_images').select('product_id,image_url,display_order').in('product_id', productIds).order('display_order') : { data: [] },
      buyerIds.length ? client.from('profiles').select('id,display_name,contact,student_id,is_verified').in('id', buyerIds) : { data: [] },
      client.from('pickup_locations').select('id,location_name'),
    ]);

    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const imageMap = new Map();
    (images || []).forEach((img) => {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.image_url);
    });
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const locationMap = new Map((locations || []).map((l) => [l.id, l.location_name]));

    const now = Date.now();

    return rows.map((row) => {
      const product = productMap.get(row.product_id);
      const buyer = profileMap.get(row.buyer_id);
      const quantity = row.quantity || 1;
      const unitPrice = Number(product?.price || 0);
      const totalPrice = unitPrice * quantity;

      const scheduledTime = row.scheduled_at ? new Date(row.scheduled_at).getTime() : 0;
      const minutesPastScheduled = scheduledTime ? (now - scheduledTime) / (60 * 1000) : 0;
      const isAutoCompleted = row.status === 'delivered' && minutesPastScheduled >= 60;
      const isAutoCancelled = row.status === 'pending' && minutesPastScheduled > 0;

      let effectiveStatus = row.status;
      if (isAutoCompleted) effectiveStatus = 'completed';
      else if (isAutoCancelled) effectiveStatus = 'cancelled';

      return {
        id: row.id,
        productId: row.product_id,
        productTitle: product?.title || 'สินค้า SPU',
        productPrice: unitPrice,
        productStatus: product?.status || 'active',
        quantity,
        totalPrice,
        image: imageMap.get(row.product_id) || '',
        location: product?.location_id ? (locationMap.get(product.location_id) || 'ไม่ระบุจุดนัดรับ') : 'ไม่ระบุจุดนัดรับ',
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        status: effectiveStatus,
        rawStatus: row.status,
        sellerDeliveredAt: row.seller_delivered_at,
        buyerConfirmedAt: row.buyer_confirmed_at,
        cancelledAt: row.cancelled_at,
        buyerId: row.buyer_id,
        buyerName: buyer?.display_name || 'ผู้ซื้อ SPU',
        buyerContact: buyer?.contact || '',
        buyerStudentId: buyer?.student_id || '',
        buyerVerified: Boolean(buyer?.is_verified),
        conversationId: row.conversation_id,
      };
    });
  } catch (err) {
    console.error('Could not load seller transactions:', err.message);
    return [];
  }
}

/**
 * คำนวณ % การนัดรับตรงเวลา:
 * - เริ่มต้นที่ 100%
 * - ยึดจากเวลาที่ผู้ขายกด "ส่งมอบสินค้าแล้ว" (sellerDeliveredAt) เทียบกับเวลานัดรับ (scheduledAt)
 * - หากส่งมอบช้ากว่าเวลานัดรับเกิน 30 นาที จะถูกหัก 1% ต่อรายการ (ต่ำสุด 0%)
 */
export function computeSellerPunctualityRate(transactions = []) {
  const evaluated = (transactions || []).filter(
    (t) => t?.sellerDeliveredAt && t?.scheduledAt,
  );

  let lateCount = 0;
  for (const t of evaluated) {
    const deliveredMs = new Date(t.sellerDeliveredAt).getTime();
    const scheduledMs = new Date(t.scheduledAt).getTime();
    if (Number.isFinite(deliveredMs) && Number.isFinite(scheduledMs)) {
      const delayMinutes = (deliveredMs - scheduledMs) / (60 * 1000);
      if (delayMinutes > 30) {
        lateCount += 1;
      }
    }
  }

  const rate = Math.max(0, 100 - lateCount);
  return {
    rate,
    lateCount,
    evaluatedCount: evaluated.length,
  };
}

export function computeSellerSalesSummary(userProducts = [], transactions = []) {
  const completedTransactions = transactions.filter((t) => t.status === 'completed');
  const pendingTransactions = transactions.filter((t) => t.status === 'pending' || t.status === 'delivered');
  const cancelledTransactions = transactions.filter((t) => t.status === 'cancelled');

  const completedRevenue = completedTransactions.reduce((sum, t) => sum + Number(t.totalPrice || 0), 0);
  const pendingRevenue = pendingTransactions.reduce((sum, t) => sum + Number(t.totalPrice || 0), 0);

  const soldProducts = userProducts.filter((p) => p.status === 'sold');
  const activeProducts = userProducts.filter((p) => p.status === 'active');
  const draftProducts = userProducts.filter((p) => p.status === 'draft' || p.status === 'archived');
  const trashProducts = userProducts.filter((p) => p.status === 'trash');

  const completedProductIds = new Set(completedTransactions.map((t) => t.productId));
  const directSoldProducts = soldProducts.filter((p) => !completedProductIds.has(p.id));
  const directSoldRevenue = directSoldProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);

  const totalRealizedSales = completedRevenue + directSoldRevenue;

  return {
    completedTransactions,
    pendingTransactions,
    cancelledTransactions,
    completedRevenue,
    pendingRevenue,
    directSoldProducts,
    directSoldRevenue,
    totalRealizedSales,
    soldProducts,
    activeProducts,
    draftProducts,
    trashProducts,
    completedCount: completedTransactions.length,
    pendingCount: pendingTransactions.length,
    cancelledCount: cancelledTransactions.length,
    soldCount: soldProducts.length,
    activeCount: activeProducts.length,
    draftCount: draftProducts.length,
    trashCount: trashProducts.length,
  };
}


