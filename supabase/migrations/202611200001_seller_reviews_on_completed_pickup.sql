DROP POLICY IF EXISTS seller_reviews_buyer_insert ON public.seller_reviews;

CREATE POLICY seller_reviews_buyer_insert
ON public.seller_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = (SELECT auth.uid())
  AND (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.conversations c ON c.product_id = p.id
      WHERE p.id = seller_reviews.product_id
        AND p.seller_id = seller_reviews.seller_id
        AND p.status = 'sold'
        AND c.seller_id = seller_reviews.seller_id
        AND c.buyer_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.pickup_appointments pa
      WHERE pa.product_id = seller_reviews.product_id
        AND pa.seller_id = seller_reviews.seller_id
        AND pa.buyer_id = (SELECT auth.uid())
        AND (
          pa.status = 'completed'
          OR (pa.status = 'delivered' AND pa.scheduled_at <= now() - interval '1 hour')
        )
    )
  )
);
