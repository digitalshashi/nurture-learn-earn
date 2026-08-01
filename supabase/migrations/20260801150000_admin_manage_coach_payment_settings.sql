-- Allow admins/super_admins to configure Razorpay on behalf of any coach
-- (previously only the coach themselves could read/write their own row).
CREATE POLICY "Admins manage all payment settings"
ON public.coach_payment_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
