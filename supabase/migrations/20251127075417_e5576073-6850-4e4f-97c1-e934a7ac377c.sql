-- Update the super admin role
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'edupulse@gmail.com');