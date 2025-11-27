-- Create payments table for tracking Pesapal transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 100.00,
  merchant_reference TEXT NOT NULL UNIQUE,
  pesapal_tracking_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  ipn_data JSONB
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own payment records
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = email);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_payments_merchant_reference ON public.payments(merchant_reference);
CREATE INDEX idx_payments_email ON public.payments(email);
CREATE INDEX idx_payments_status ON public.payments(payment_status);