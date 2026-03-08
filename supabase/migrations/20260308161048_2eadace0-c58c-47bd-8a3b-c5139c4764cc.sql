
-- Fix overly permissive insert policies
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "System can insert sales" ON public.affiliate_sales;

-- Clicks: only authenticated users can insert
CREATE POLICY "Authenticated can insert clicks" ON public.affiliate_clicks FOR INSERT TO authenticated WITH CHECK (true);

-- Sales: only authenticated users can insert  
CREATE POLICY "Authenticated can insert sales" ON public.affiliate_sales FOR INSERT TO authenticated WITH CHECK (true);
