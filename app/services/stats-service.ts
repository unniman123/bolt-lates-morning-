import { supabase } from './supabase';

interface UserStats {
    winRate: number;
    totalEarnings: number;
    totalMatches: number;
    wins: number;
    losses: number;
}

export class StatsService {
    static async getUserStats(userId: string): Promise<UserStats> {
        try {
            // Get match statistics
            const { data: matches, error: matchError } = await supabase
                .from('matches')
                .select('winner_id, player1_score, player2_score')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'completed');

            if (matchError) throw matchError;

            // Calculate wins and total matches
            const totalMatches = matches.length;
            const wins = matches.filter(match => match.winner_id === userId).length;

            // Get total earnings from transactions
            const { data: earnings, error: earningsError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'prize')
                .eq('status', 'completed');

            if (earningsError) throw earningsError;

            const totalEarnings = earnings.reduce((sum, tx) => sum + tx.amount, 0);
            const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

            return {
                winRate: Math.round(winRate),
                totalEarnings,
                totalMatches,
                wins,
                losses: totalMatches - wins
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return {
                winRate: 0,
                totalEarnings: 0,
                totalMatches: 0,
                wins: 0,
                losses: 0
            };
        }
    }
}