-- Rename pesapal_tracking_id to lipana_transaction_id in payments table
ALTER TABLE public.payments 
  RENAME COLUMN pesapal_tracking_id TO lipana_transaction_id;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN public.payments.lipana_transaction_id IS 'Lipana transaction reference ID';
