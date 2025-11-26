-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE quality_status AS ENUM ('good', 'caution', 'restricted');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'held');
CREATE TYPE question_type AS ENUM ('mcq', 'checkbox', 'rating', 'likert', 'text');

-- Users/Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_number TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES profiles(id),
  quality_score INTEGER DEFAULT 100 CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_status quality_status DEFAULT 'good',
  is_restricted BOOLEAN DEFAULT false,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  approved_balance DECIMAL(10,2) DEFAULT 0,
  held_balance DECIMAL(10,2) DEFAULT 0,
  completed_surveys INTEGER DEFAULT 0,
  has_withdrawn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Surveys table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL CHECK (reward_amount >= 20 AND reward_amount <= 30),
  time_limit_minutes INTEGER NOT NULL,
  total_questions INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey questions table
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey responses table
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  is_approved BOOLEAN DEFAULT NULL,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, user_id)
);

-- Withdrawals table
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status withdrawal_status DEFAULT 'pending',
  payment_method TEXT,
  payment_details JSONB,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral earnings table
CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  survey_response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  is_withdrawable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Surveys policies
CREATE POLICY "Anyone authenticated can view active surveys"
  ON surveys FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage surveys"
  ON surveys FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Survey questions policies
CREATE POLICY "Users can view questions for active surveys"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = survey_questions.survey_id 
      AND surveys.is_active = true
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage questions"
  ON survey_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Survey responses policies
CREATE POLICY "Users can view their own responses"
  ON survey_responses FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own responses"
  ON survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all responses"
  ON survey_responses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Withdrawals policies
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage withdrawals"
  ON withdrawals FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Referral earnings policies
CREATE POLICY "Users can view their referral earnings"
  ON referral_earnings FOR SELECT
  USING (auth.uid() = referrer_id OR has_role(auth.uid(), 'admin'));

-- Functions and triggers
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'EDPULSE' || FLOOR(RANDOM() * 90 + 10)::TEXT;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    generate_referral_code()
  );
  
  -- Add user role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_quality_score()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER update_quality_status_trigger
  BEFORE UPDATE OF quality_score ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_score();

CREATE OR REPLACE FUNCTION process_survey_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  survey_reward DECIMAL(10,2);
  referrer_id UUID;
  referral_bonus DECIMAL(10,2);
BEGIN
  -- Get survey reward
  SELECT reward_amount INTO survey_reward
  FROM surveys WHERE id = NEW.survey_id;
  
  -- Update user profile
  UPDATE profiles
  SET 
    total_earnings = total_earnings + survey_reward,
    approved_balance = approved_balance + survey_reward,
    completed_surveys = completed_surveys + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Process referral bonus
  SELECT referred_by INTO referrer_id
  FROM profiles WHERE id = NEW.user_id;
  
  IF referrer_id IS NOT NULL THEN
    referral_bonus := survey_reward * 0.25;
    
    -- Add referral earning record
    INSERT INTO referral_earnings (referrer_id, referred_user_id, survey_response_id, amount)
    VALUES (referrer_id, NEW.user_id, NEW.id, referral_bonus);
    
    -- Update referrer balance
    UPDATE profiles
    SET 
      total_earnings = total_earnings + referral_bonus,
      approved_balance = approved_balance + referral_bonus,
      updated_at = NOW()
    WHERE id = referrer_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_survey_completed
  AFTER INSERT ON survey_responses
  FOR EACH ROW
  WHEN (NEW.is_approved IS NULL OR NEW.is_approved = true)
  EXECUTE FUNCTION process_survey_completion();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();