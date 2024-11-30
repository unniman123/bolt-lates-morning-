import { supabase } from './supabase';

export async function setupDatabase() {
  if (!supabase) return;

  try {
    // Create profiles table
    await supabase.rpc('create_profiles_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID REFERENCES auth.users(id) PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          game_id TEXT,
          avatar_url TEXT,
          wallet_balance DECIMAL(10,2) DEFAULT 0.00,
          rating INTEGER DEFAULT 1000,
          is_online BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          CONSTRAINT username_length CHECK (char_length(username) >= 3)
        );
        
        CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
      `
    });

    // Create tournaments table
    await supabase.rpc('create_tournaments_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS tournaments (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          title TEXT NOT NULL,
          game_type TEXT NOT NULL,
          entry_fee DECIMAL(10,2) NOT NULL,
          prize_pool DECIMAL(10,2) NOT NULL,
          max_participants INTEGER NOT NULL,
          current_participants INTEGER DEFAULT 0,
          bracket_type TEXT DEFAULT 'single_elimination',
          status TEXT DEFAULT 'open',
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          creator_id UUID REFERENCES profiles(id),
          CONSTRAINT valid_bracket_type CHECK (bracket_type IN ('single_elimination', 'double_elimination')),
          CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'completed'))
        );
        
        CREATE INDEX IF NOT EXISTS tournaments_status_idx ON tournaments(status);
      `
    });

    // Create tournament_participants table
    await supabase.rpc('create_tournament_participants_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS tournament_participants (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          tournament_id UUID REFERENCES tournaments(id),
          player_id UUID REFERENCES profiles(id),
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(tournament_id, player_id)
        );
        
        CREATE INDEX IF NOT EXISTS tournament_participants_idx ON tournament_participants(tournament_id, player_id);
      `
    });

    // Create matches table
    await supabase.rpc('create_matches_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS matches (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          tournament_id UUID REFERENCES tournaments(id),
          round INTEGER NOT NULL,
          match_order INTEGER NOT NULL,
          player1_id UUID REFERENCES profiles(id),
          player2_id UUID REFERENCES profiles(id),
          player1_score INTEGER,
          player2_score INTEGER,
          winner_id UUID REFERENCES profiles(id),
          status TEXT DEFAULT 'scheduled',
          scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          CONSTRAINT valid_match_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'disputed'))
        );
        
        CREATE INDEX IF NOT EXISTS matches_tournament_idx ON matches(tournament_id);
        CREATE INDEX IF NOT EXISTS matches_players_idx ON matches(player1_id, player2_id);
      `
    });

    // Create transactions table
    await supabase.rpc('create_transactions_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id),
          amount DECIMAL(10,2) NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          reference_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          CONSTRAINT valid_transaction_type CHECK (type IN ('deposit', 'withdrawal', 'entry_fee', 'prize')),
          CONSTRAINT valid_transaction_status CHECK (status IN ('pending', 'completed', 'failed'))
        );
        
        CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_id, type);
      `
    });

    // Create chat_messages table
    await supabase.rpc('create_chat_messages_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          match_id UUID REFERENCES matches(id),
          user_id UUID REFERENCES profiles(id),
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS chat_messages_match_idx ON chat_messages(match_id);
      `
    });

    // Create notifications table
    await supabase.rpc('create_notifications_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          CONSTRAINT valid_notification_type CHECK (type IN ('match_invite', 'tournament_start', 'match_result', 'prize_won'))
        );
        
        CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read);
      `
    });

    // Create stored procedures
    await supabase.rpc('create_stored_procedures', {
      sql: `
        -- Join Tournament procedure
        CREATE OR REPLACE FUNCTION join_tournament(
          p_tournament_id UUID,
          p_user_id UUID
        ) RETURNS void AS $$
        DECLARE
          v_tournament record;
          v_balance decimal;
        BEGIN
          -- Get tournament details
          SELECT * INTO v_tournament
          FROM tournaments
          WHERE id = p_tournament_id
          FOR UPDATE;
          
          -- Check tournament exists and is open
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Tournament not found';
          END IF;
          
          IF v_tournament.status != 'open' THEN
            RAISE EXCEPTION 'Tournament is not open for registration';
          END IF;
          
          -- Check if tournament is full
          IF v_tournament.current_participants >= v_tournament.max_participants THEN
            RAISE EXCEPTION 'Tournament is full';
          END IF;
          
          -- Check user balance
          SELECT wallet_balance INTO v_balance
          FROM profiles
          WHERE id = p_user_id;
          
          IF v_balance < v_tournament.entry_fee THEN
            RAISE EXCEPTION 'Insufficient balance';
          END IF;
          
          -- Add participant
          INSERT INTO tournament_participants (tournament_id, player_id)
          VALUES (p_tournament_id, p_user_id);
          
          -- Update tournament participants count
          UPDATE tournaments
          SET current_participants = current_participants + 1
          WHERE id = p_tournament_id;
          
          -- Deduct entry fee
          UPDATE profiles
          SET wallet_balance = wallet_balance - v_tournament.entry_fee
          WHERE id = p_user_id;
          
          -- Create transaction record
          INSERT INTO transactions (user_id, amount, type, status, reference_id)
          VALUES (p_user_id, v_tournament.entry_fee, 'entry_fee', 'completed', p_tournament_id);
          
          -- Check if tournament should start
          IF v_tournament.current_participants + 1 = v_tournament.max_participants THEN
            UPDATE tournaments
            SET status = 'in_progress'
            WHERE id = p_tournament_id;
          END IF;
        END;
        $$ LANGUAGE plpgsql;

        -- Process Prize Distribution procedure
        CREATE OR REPLACE FUNCTION process_prize_distribution(
          p_tournament_id UUID,
          p_winner_id UUID,
          p_amount DECIMAL
        ) RETURNS void AS $$
        BEGIN
          -- Update winner's balance
          UPDATE profiles
          SET wallet_balance = wallet_balance + p_amount
          WHERE id = p_winner_id;
          
          -- Create transaction record
          INSERT INTO transactions (user_id, amount, type, status, reference_id)
          VALUES (p_winner_id, p_amount, 'prize', 'completed', p_tournament_id);
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}