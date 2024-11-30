import { createClient } from '@supabase/supabase-js';
import fetch from 'cross-fetch';
import { alert } from '@nativescript/core';

const supabaseUrl = 'https://zwjokeieerbbzsoqukuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3am9rZWllZXJiYnpzb3F1a3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4NjI4MzIsImV4cCI6MjA0ODQzODgzMn0.9dccWoBFaIT_-3E1OXnFq489u2SnxnDkKKGLd552L8I';

const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: {
    fetch: fetch
  }
};

export function initializeSupabase() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, options);
    console.log('Supabase initialized successfully');
    return supabase;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    alert({
      title: "Connection Error",
      message: "Failed to connect to Supabase. Please check your connection.",
      okButtonText: "OK"
    });
    return null;
  }
}

// Database types
export interface Profile {
  id: string;
  username: string;
  game_id?: string;
  avatar_url?: string;
  wallet_balance: number;
  rating: number;
  is_online: boolean;
  created_at: string;
}

export interface Tournament {
  id: string;
  title: string;
  game_type: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number;
  current_participants: number;
  bracket_type: 'single_elimination' | 'double_elimination';
  status: 'open' | 'in_progress' | 'completed';
  start_time: string;
  created_at: string;
  creator_id: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_order: number;
  player1_id: string;
  player2_id: string;
  player1_score?: number;
  player2_score?: number;
  winner_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'disputed';
  scheduled_time: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize';
  status: 'pending' | 'completed' | 'failed';
  reference_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  match_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'match_invite' | 'tournament_start' | 'match_result' | 'prize_won';
  read: boolean;
  created_at: string;
}

// Initialize Supabase client
export const supabase = initializeSupabase();