-- Add INSERT policy for payments table to allow users to create payment records
CREATE POLICY "Users can create payment records"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also update the payments table to allow public inserts since users aren't authenticated yet during registration
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create payment records" ON payments;

CREATE POLICY "Anyone can create payment records"
ON payments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);