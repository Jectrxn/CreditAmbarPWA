export interface Profile {
  id: string; // UUID references auth.users
  store_name: string;
  created_at: string;
}

export interface Customer {
  id: string; // UUID
  store_id: string; // UUID references profiles(id)
  name: string;
  phone?: string;
  credit_limit: number;
  balance: number;
  created_at: string;
}

export interface Product {
  id: string; // UUID
  store_id: string; // UUID references profiles(id)
  name: string;
  price: number;
  sku?: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string; // UUID
  store_id: string; // UUID references profiles(id)
  customer_id: string;
  cashier_pin_hash: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  synced?: boolean; // Local tracking
}

export interface TransactionItem {
  id: string; // UUID
  transaction_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Customer, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Product, 'id'>>;
      };
      credit_transactions: {
        Row: CreditTransaction;
        Insert: Omit<CreditTransaction, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<CreditTransaction, 'id'>>;
      };
      transaction_items: {
        Row: TransactionItem;
        Insert: Omit<TransactionItem, 'id'> & { id?: string };
        Update: Partial<Omit<TransactionItem, 'id'>>;
      };
    };
  };
}
