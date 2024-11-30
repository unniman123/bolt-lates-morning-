import { supabase } from './supabase';
import { BracketService } from './bracket-service';
import { ProfileService } from './profile-service';
import { WalletService } from './wallet-service';

interface MatchResult {
  matchId: string;
  player1Score: number;
  player2Score: number;
  winnerId: string;
  bracketId?: string;
  tournamentId?: string;
}

export class MatchResultService {
  static async submitResult(result: MatchResult): Promise<void> {
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', result.matchId)
      .single();

    if (matchError) throw matchError;

    // Start a transaction
    const { error: txError } = await supabase.rpc('submit_match_result', {
      p_match_id: result.matchId,
      p_player1_score: result.player1Score,
      p_player2_score: result.player2Score,
      p_winner_id: result.winnerId
    });

    if (txError) throw txError;

    // If this is a tournament match, update the bracket
    if (match.tournament_id && match.bracket_id) {
      await this.progressTournament(match.tournament_id, match.bracket_id, result.winnerId);
    }

    // Update player ratings
    await this.updatePlayerRatings(
      match.player1_id,
      match.player2_id,
      result.winnerId
    );
  }

  private static async progressTournament(
    tournamentId: string,
    bracketId: string,
    winnerId: string
  ): Promise<void> {
    const { data: bracket, error: bracketError } = await supabase
      .from('tournament_brackets')
      .select('*')
      .eq('id', bracketId)
      .single();

    if (bracketError) throw bracketError;

    // Update current bracket match
    await BracketService.updateBracketMatch(bracketId, {
      winner_id: winnerId
    });

    // If there's a next match, update it with the winner
    if (bracket.next_match_id) {
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('tournament_brackets')
        .select('*')
        .eq('id', bracket.next_match_id)
        .single();

      if (nextMatchError) throw nextMatchError;

      // Determine if winner should be player1 or player2 in next match
      const isFirstPlayer = nextMatch.match_order % 2 === 1;
      const update = isFirstPlayer
        ? { player1_id: winnerId }
        : { player2_id: winnerId };

      await BracketService.updateBracketMatch(bracket.next_match_id, update);

      // Create the actual match for the next round
      await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          bracket_id: bracket.next_match_id,
          player1_id: isFirstPlayer ? winnerId : nextMatch.player1_id,
          player2_id: isFirstPlayer ? nextMatch.player2_id : winnerId,
          status: 'scheduled',
          scheduled_time: new Date().toISOString()
        });
    } else {
      // This was the final match, complete the tournament
      await this.completeTournament(tournamentId, winnerId);
    }
  }

  private static async completeTournament(
    tournamentId: string,
    winnerId: string
  ): Promise<void> {
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    // Update tournament status
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);

    // Distribute prize pool
    await WalletService.processPrizeDistribution(
      tournamentId,
      winnerId,
      tournament.prize_pool
    );
  }

  private static async updatePlayerRatings(
    player1Id: string,
    player2Id: string,
    winnerId: string
  ): Promise<void> {
    const K_FACTOR = 32;

    const player1 = await ProfileService.getProfile(player1Id);
    const player2 = await ProfileService.getProfile(player2Id);

    const player1Rating = player1?.rating || 1000;
    const player2Rating = player2?.rating || 1000;

    // Calculate expected scores
    const expectedScore1 = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
    const expectedScore2 = 1 / (1 + Math.pow(10, (player1Rating - player2Rating) / 400));

    // Calculate actual scores
    const actualScore1 = winnerId === player1Id ? 1 : 0;
    const actualScore2 = winnerId === player2Id ? 1 : 0;

    // Calculate new ratings
    const newRating1 = Math.round(player1Rating + K_FACTOR * (actualScore1 - expectedScore1));
    const newRating2 = Math.round(player2Rating + K_FACTOR * (actualScore2 - expectedScore2));

    // Update ratings
    await Promise.all([
      ProfileService.updateProfile(player1Id, { rating: newRating1 }),
      ProfileService.updateProfile(player2Id, { rating: newRating2 })
    ]);
  }
}