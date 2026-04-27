import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Group = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceRecord = {
  id: string;
  student_id: string;
  date: string;
  created_at: string;
};

export type PaymentRecord = {
  id: string;
  student_id: string;
  amount: number;
  sessions_count: number;
  date: string;
  created_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  price_per_block: number;
  created_at: string;
  updated_at: string;
};
