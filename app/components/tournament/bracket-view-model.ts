import { Observable } from '@nativescript/core';
import { BracketService, BracketNode } from '../../services/bracket-service';
import { ProfileService } from '../../services/profile-service';

interface BracketMatch extends BracketNode {
  player1?: any;
  player2?: any;
  player1Score?: number;
  player2Score?: number;
  player1Winner?: boolean;
  player2Winner?: boolean;
}

interface BracketRound {
  roundIndex: number;
  matches: BracketMatch[];
}

export class BracketViewModel extends Observable {
  private _rounds: BracketRound[] = [];
  private _bracketColumns: string = '';

  constructor(private tournamentId: string) {
    super();
    this.loadBracket();
  }

  get rounds(): BracketRound[] {
    return this._rounds;
  }

  set rounds(value: BracketRound[]) {
    if (this._rounds !== value) {
      this._rounds = value;
      this.notifyPropertyChange('rounds', value);
    }
  }

  get bracketColumns(): string {
    return this._bracketColumns;
  }

  set bracketColumns(value: string) {
    if (this._bracketColumns !== value) {
      this._bracketColumns = value;
      this.notifyPropertyChange('bracketColumns', value);
    }
  }

  async loadBracket() {
    try {
      const matches = await BracketService.getBracketMatches(this.tournamentId);
      const enrichedMatches = await this.enrichMatchesWithPlayerData(matches);
      this.organizeBracketRounds(enrichedMatches);
    } catch (error) {
      console.error('Error loading bracket:', error);
    }
  }

  private async enrichMatchesWithPlayerData(matches: BracketNode[]): Promise<BracketMatch[]> {
    const enrichedMatches: BracketMatch[] = [];

    for (const match of matches) {
      const enrichedMatch: BracketMatch = {
        ...match,
        player1: match.player1Id ? await ProfileService.getProfile(match.player1Id) : null,
        player2: match.player2Id ? await ProfileService.getProfile(match.player2Id) : null,
        player1Winner: match.winnerId === match.player1Id,
        player2Winner: match.winnerId === match.player2Id
      };
      enrichedMatches.push(enrichedMatch);
    }

    return enrichedMatches;
  }

  private organizeBracketRounds(matches: BracketMatch[]) {
    const roundsMap = new Map<number, BracketMatch[]>();
    
    matches.forEach(match => {
      const roundMatches = roundsMap.get(match.round) || [];
      roundMatches.push(match);
      roundsMap.set(match.round, roundMatches);
    });

    const rounds: BracketRound[] = [];
    roundsMap.forEach((matches, roundIndex) => {
      rounds.push({
        roundIndex: roundIndex - 1,
        matches: matches.sort((a, b) => a.matchOrder - b.matchOrder)
      });
    });

    this.rounds = rounds;
    this.bracketColumns = `${'auto '.repeat(rounds.length)}`;
  }
}