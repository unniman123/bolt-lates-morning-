import { supabase } from './supabase';

export interface BracketNode {
  id: string;
  round: number;
  matchOrder: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  nextMatchId?: string;
}

export class BracketService {
  static async generateBracket(tournamentId: string, participantIds: string[]): Promise<void> {
    try {
      const shuffledParticipants = this.shuffleArray([...participantIds]);
      const rounds = Math.ceil(Math.log2(shuffledParticipants.length));
      const totalMatches = Math.pow(2, rounds) - 1;
      
      // Create bracket structure
      for (let round = 1; round <= rounds; round++) {
        const matchesInRound = Math.pow(2, rounds - round);
        
        for (let match = 1; match <= matchesInRound; match++) {
          const { data: bracketMatch, error } = await supabase
            .from('tournament_brackets')
            .insert({
              tournament_id: tournamentId,
              round: round,
              match_order: match
            })
            .select()
            .single();

          if (error) throw error;

          // Assign players to first round matches
          if (round === 1) {
            const player1Index = (match - 1) * 2;
            const player2Index = player1Index + 1;

            if (shuffledParticipants[player1Index]) {
              await this.updateBracketMatch(bracketMatch.id, {
                player1_id: shuffledParticipants[player1Index]
              });
            }

            if (shuffledParticipants[player2Index]) {
              await this.updateBracketMatch(bracketMatch.id, {
                player2_id: shuffledParticipants[player2Index]
              });
            }
          }
        }
      }

      // Link matches to their next matches in the bracket
      await this.linkBracketMatches(tournamentId);
    } catch (error) {
      console.error('Error generating bracket:', error);
      throw error;
    }
  }

  static async updateBracketMatch(matchId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('tournament_brackets')
      .update(updates)
      .eq('id', matchId);

    if (error) throw error;
  }

  static async getBracketMatches(tournamentId: string): Promise<BracketNode[]> {
    const { data, error } = await supabase
      .from('tournament_brackets')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  private static async linkBracketMatches(tournamentId: string): Promise<void> {
    const matches = await this.getBracketMatches(tournamentId);
    
    for (const match of matches) {
      if (match.round === 1) continue;
      
      const previousRoundMatches = matches.filter(m => 
        m.round === match.round - 1 && 
        Math.ceil(m.matchOrder / 2) === match.matchOrder
      );

      for (const prevMatch of previousRoundMatches) {
        await this.updateBracketMatch(prevMatch.id, {
          next_match_id: match.id
        });
      }
    }
  }

  private static shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}