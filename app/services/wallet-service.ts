import { supabase } from './supabase';
import type { Transaction } from './supabase';

export class WalletService {
  static async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data.wallet_balance;
  }

  static async getTransactionHistory(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async processEntryFee(userId: string, tournamentId: string, amount: number): Promise<void> {
    const { error } = await supabase.rpc('process_entry_fee', {
      p_user_id: userId,
      p_tournament_id: tournamentId,
      p_amount: amount
    });

    if (error) throw error;
  }

  static async processPrizeDistribution(
    tournamentId: string,
    winnerId: string,
    amount: number
  ): Promise<void> {
    const { error } = await supabase.rpc('process_prize_distribution', {
      p_tournament_id: tournamentId,
      p_winner_id: winnerId,
      p_amount: amount
    });

    if (error) throw error;
  }
}