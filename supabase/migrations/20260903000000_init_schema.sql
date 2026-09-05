-- Supabase Schema Migration: 20260903000000_init_schema.sql
-- CreditAmbar PWA Core Schema with Cross-Tenant RLS & 10-Minute Grace Window

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  store_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0.00,
  balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store can manage own customers" ON customers
  FOR ALL USING (store_id = auth.uid());

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store can manage own products" ON products
  FOR ALL USING (store_id = auth.uid());

-- 4. Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES profiles(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  cashier_pin_hash TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store can view own transactions" ON credit_transactions
  FOR SELECT USING (store_id = auth.uid());

CREATE POLICY "Store can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (store_id = auth.uid());

-- 10-minute grace window for updates
CREATE POLICY "Store can update transactions within grace window" ON credit_transactions
  FOR UPDATE USING (
    store_id = auth.uid() AND 
    (NOW() - created_at) < INTERVAL '10 minutes'
  );

-- 5. Transaction Items Table
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES credit_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL
);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store can manage transaction items" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM credit_transactions ct
      WHERE ct.id = transaction_items.transaction_id
      AND ct.store_id = auth.uid()
    )
  );
