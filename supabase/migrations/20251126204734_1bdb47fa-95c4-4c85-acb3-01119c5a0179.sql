-- Fix security warnings by setting search_path on functions

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'EDPULSE' || FLOOR(RANDOM() * 90 + 10)::TEXT;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION update_quality_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update quality status based on score
  IF NEW.quality_score >= 80 THEN
    NEW.quality_status := 'good';
  ELSIF NEW.quality_score >= 50 THEN
    NEW.quality_status := 'caution';
  ELSE
    NEW.quality_status := 'restricted';
    NEW.is_restricted := true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;