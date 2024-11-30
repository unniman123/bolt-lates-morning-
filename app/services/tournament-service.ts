import { supabase } from './supabase';
import type { Tournament } from './supabase';

export class TournamentService {
  static async listTournaments(filters?: {
    status?: 'open' | 'in_progress' | 'completed';
    gameType?: string;
  }): Promise<Tournament[]> {
    let query = supabase.from('tournaments').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.gameType) {
      query = query.eq('game_type', filters.gameType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async createTournament(tournament: Partial<Tournament>): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .insert([tournament])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async joinTournament(tournamentId: string, userId: string): Promise<void> {
    const { error: tournamentError } = await supabase.rpc('join_tournament', {
      p_tournament_id: tournamentId,
      p_user_id: userId
    });

    if (tournamentError) throw tournamentError;
  }

  static async getTournamentDetails(tournamentId: string): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    return data;
  }
}