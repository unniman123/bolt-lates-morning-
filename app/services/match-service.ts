import { supabase } from './supabase';
import type { Match, Profile } from './supabase';

interface MatchFilters {
    gameType: string;
    entryFee: number;
}

interface ChallengeParams {
    challengerId: string;
    opponentId: string;
    gameType: string;
    entryFee: number;
}

interface QuickMatchParams {
    userId: string;
    gameType: string;
    entryFee: number;
}

export class MatchService {
    static async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('scheduled_time', { ascending: true });

        if (error) throw error;
        return data;
    }

    static async getUserMatches(userId: string): Promise<Match[]> {
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .order('scheduled_time', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async findAvailablePlayers(filters: MatchFilters): Promise<Profile[]> {
        // Find players who are online and match the criteria
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_online', true)
            .gte('wallet_balance', filters.entryFee);

        if (error) throw error;
        return data;
    }

    static async createChallenge(params: ChallengeParams): Promise<Match> {
        const { data, error } = await supabase
            .from('matches')
            .insert([{
                player1_id: params.challengerId,
                player2_id: params.opponentId,
                game_type: params.gameType,
                entry_fee: params.entryFee,
                status: 'pending',
                scheduled_time: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async findQuickMatch(params: QuickMatchParams): Promise<Match | null> {
        // Look for an existing match request
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('game_type', params.gameType)
            .eq('entry_fee', params.entryFee)
            .eq('status', 'pending')
            .neq('player1_id', params.userId)
            .is('player2_id', null)
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

        if (data) {
            // Join existing match
            const { data: updatedMatch, error: updateError } = await supabase
                .from('matches')
                .update({ player2_id: params.userId, status: 'scheduled' })
                .eq('id', data.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return updatedMatch;
        }

        // Create new match request
        const { data: newMatch, error: createError } = await supabase
            .from('matches')
            .insert([{
                player1_id: params.userId,
                game_type: params.gameType,
                entry_fee: params.entryFee,
                status: 'pending',
                scheduled_time: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) throw createError;
        return null; // Return null to continue searching
    }

    static async submitMatchResult(
        matchId: string,
        player1Score: number,
        player2Score: number,
        winnerId: string
    ): Promise<Match> {
        const { data, error } = await supabase
            .from('matches')
            .update({
                player1_score: player1Score,
                player2_score: player2Score,
                winner_id: winnerId,
                status: 'completed'
            })
            .eq('id', matchId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async disputeMatch(matchId: string): Promise<Match> {
        const { data, error } = await supabase
            .from('matches')
            .update({ status: 'disputed' })
            .eq('id', matchId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}