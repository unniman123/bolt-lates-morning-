import { Observable } from '@nativescript/core';
import { TournamentService } from '../../services/tournament-service';
import { MatchService } from '../../services/match-service';
import type { Tournament, Match } from '../../services/supabase';

export class TournamentDetailViewModel extends Observable {
    private _tournament: Tournament | null = null;
    private _matches: Match[] = [];
    private _canJoin: boolean = false;

    constructor(private tournamentId: string) {
        super();
        this.loadTournamentDetails();
    }

    get tournament(): Tournament | null {
        return this._tournament;
    }

    set tournament(value: Tournament | null) {
        if (this._tournament !== value) {
            this._tournament = value;
            this.notifyPropertyChange('tournament', value);
            this.updateCanJoin();
        }
    }

    get matches(): Match[] {
        return this._matches;
    }

    set matches(value: Match[]) {
        if (this._matches !== value) {
            this._matches = value;
            this.notifyPropertyChange('matches', value);
        }
    }

    get canJoin(): boolean {
        return this._canJoin;
    }

    set canJoin(value: boolean) {
        if (this._canJoin !== value) {
            this._canJoin = value;
            this.notifyPropertyChange('canJoin', value);
        }
    }

    private updateCanJoin() {
        if (!this._tournament) {
            this.canJoin = false;
            return;
        }

        this.canJoin = 
            this._tournament.status === 'open' && 
            this._tournament.current_participants < this._tournament.max_participants;
    }

    async loadTournamentDetails() {
        try {
            this.tournament = await TournamentService.getTournamentDetails(this.tournamentId);
            this.matches = await MatchService.getMatchesByTournament(this.tournamentId);
        } catch (error) {
            console.error('Failed to load tournament details:', error);
            alert({
                title: 'Error',
                message: 'Failed to load tournament details. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async joinTournament() {
        try {
            await TournamentService.joinTournament(this.tournamentId, 'current-user-id'); // Replace with actual user ID
            await this.loadTournamentDetails(); // Refresh the data
            alert({
                title: 'Success',
                message: 'Successfully joined the tournament!',
                okButtonText: 'OK'
            });
        } catch (error) {
            console.error('Failed to join tournament:', error);
            alert({
                title: 'Error',
                message: error.message || 'Failed to join tournament. Please try again.',
                okButtonText: 'OK'
            });
        }
    }
}