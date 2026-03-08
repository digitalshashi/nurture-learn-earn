
-- Affiliate Programs (coach creates these per course/product)
CREATE TABLE public.affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  commission_percent numeric NOT NULL DEFAULT 10,
  commission_type text NOT NULL DEFAULT 'percentage',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate Links (each student gets unique link per program)
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.affiliate_programs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  referral_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate Clicks
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate Sales
CREATE TABLE public.affiliate_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.affiliate_links(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid NOT NULL,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  coupon_code text,
  amount_paid numeric NOT NULL DEFAULT 0,
  commission_earned numeric NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate Payouts
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  remark text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Affiliate Bank Details
CREATE TABLE public.affiliate_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text,
  account_holder text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_bank_details ENABLE ROW LEVEL SECURITY;

-- Affiliate Programs: coaches manage their own, everyone can view active
CREATE POLICY "Anyone can view active programs" ON public.affiliate_programs FOR SELECT USING (is_active = true);
CREATE POLICY "Coaches can manage programs" ON public.affiliate_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = affiliate_programs.course_id AND c.coach_id = auth.uid())
);

-- Affiliate Links: users manage own
CREATE POLICY "Users can view own links" ON public.affiliate_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create links" ON public.affiliate_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can view all links for their programs" ON public.affiliate_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_programs ap JOIN public.courses c ON c.id = ap.course_id WHERE ap.id = affiliate_links.program_id AND c.coach_id = auth.uid())
);

-- Affiliate Clicks: insert open, select for link owner or coach
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Link owners can view clicks" ON public.affiliate_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_links al WHERE al.id = affiliate_clicks.link_id AND al.user_id = auth.uid())
);

-- Affiliate Sales: link owner and coach can view
CREATE POLICY "Affiliates can view own sales" ON public.affiliate_sales FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_links al WHERE al.id = affiliate_sales.link_id AND al.user_id = auth.uid())
);
CREATE POLICY "Coaches can view sales" ON public.affiliate_sales FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliate_links al JOIN public.affiliate_programs ap ON ap.id = al.program_id JOIN public.courses c ON c.id = ap.course_id WHERE al.id = affiliate_sales.link_id AND c.coach_id = auth.uid())
);
CREATE POLICY "System can insert sales" ON public.affiliate_sales FOR INSERT WITH CHECK (true);

-- Affiliate Payouts: user views own, coach manages
CREATE POLICY "Users view own payouts" ON public.affiliate_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can manage payouts" ON public.affiliate_payouts FOR ALL USING (
  has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin')
);

-- Bank Details: users manage own
CREATE POLICY "Users manage own bank details" ON public.affiliate_bank_details FOR ALL USING (auth.uid() = user_id);
