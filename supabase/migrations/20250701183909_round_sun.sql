/*
  # Initial Database Schema for FloatBook

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `logo_url` (text, optional)
      - `created_at` (timestamp)
    
    - `company_users`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (text, default 'member')
      - `created_at` (timestamp)
      - Unique constraint on (company_id, user_id)
    
    - `rooms`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `name` (text, required)
      - `price` (numeric, required)
      - `capacity` (integer, required)
      - `created_at` (timestamp)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `room_id` (uuid, foreign key to rooms)
      - `booking_date` (date, required)
      - `customer_name` (text, required)
      - `customer_email` (text, required)
      - `customer_phone` (text, optional)
      - `is_paid` (boolean, default false)
      - `total_amount` (numeric, required)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their company data
    - Company admins can manage rooms and bookings
    - Users can only access data from their associated company

  3. Extensions
    - Enable uuid-ossp extension for UUID generation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create 'companies' table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for 'companies'
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create 'company_users' table
CREATE TABLE IF NOT EXISTS company_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- Enable RLS for 'company_users'
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Create 'rooms' table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for 'rooms'
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create 'bookings' table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  is_paid boolean NOT NULL DEFAULT false,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for 'bookings'
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'companies'
CREATE POLICY "Enable read access for all users" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own company" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can update their company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = companies.id AND user_id = auth.uid()
    )
  );

-- RLS Policies for 'company_users'
CREATE POLICY "Users can read their own company_user entry" ON company_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own company_user entry" ON company_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company admins can read all company users" ON company_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = company_users.company_id 
      AND cu.user_id = auth.uid() 
      AND cu.role = 'admin'
    )
  );

-- RLS Policies for 'rooms'
CREATE POLICY "Company members can read rooms of their company" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = rooms.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can insert rooms" ON rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = rooms.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update rooms" ON rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = rooms.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can delete rooms" ON rooms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = rooms.company_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for 'bookings'
CREATE POLICY "Company members can read bookings of their company" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = bookings.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can insert bookings" ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = bookings.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = bookings.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can delete bookings" ON bookings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = bookings.company_id AND user_id = auth.uid()
    )
  );