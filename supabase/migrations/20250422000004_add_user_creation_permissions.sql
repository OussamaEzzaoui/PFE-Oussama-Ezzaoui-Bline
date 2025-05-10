/*
  # Add user creation permissions (using is_admin function)

  1. Changes
    - Create profiles table if it doesn't exist
    - Add is_admin(uid) function for admin checks
    - Add RLS policies for profile management using is_admin
    - Grant necessary permissions for user creation
    - Set up admin role management

  2. Security
    - Only admins can create new users
    - Only admins can manage user roles
    - Proper RLS policies for profile access
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('normal', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create a function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT role = 'admin' FROM profiles WHERE user_id = uid
$$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;

-- Create policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update user roles"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can create profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated; 