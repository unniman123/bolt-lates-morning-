import { Observable } from '@nativescript/core';
import { MatchService } from '../../services/match-service';
import { ProfileService } from '../../services/profile-service';
import { TournamentService } from '../../services/tournament-service';
import type { Match, Profile, Tournament } from '../../services/supabase';

export class MatchDetailViewModel extends Observable {
    private _match: Match | null = null;
    private _tournament: Tournament | null = null;
    private _player1: Profile | null = null;
    private _player2: Profile | null = null;
    private _player1Score: number = 0;
    private _player2Score: number = 0;
    private _canSubmitScore: boolean = false;
    private _canDispute: boolean = false;

    constructor(private matchId: string) {
        super();
        this.loadMatchDetails();
    }

    // Getters and setters for observable properties
    get match(): Match | null {
        return this._match;
    }

    set match(value: Match | null) {
        if (this._match !== value) {
            this._match = value;
            this.notifyPropertyChange('match', value);
            this.updateActionStates();
        }
    }

    get tournament(): Tournament | null {
        return this._tournament;
    }

    set tournament(value: Tournament | null) {
        if (this._tournament !== value) {
            this._tournament = value;
            this.notifyPropertyChange('tournament', value);
        }
    }

    get player1(): Profile | null {
        return this._player1;
    }

    set player1(value: Profile | null) {
        if (this._player1 !== value) {
            this._player1 = value;
            this.notifyPropertyChange('player1', value);
        }
    }

    get player2(): Profile | null {
        return this._player2;
    }

    set player2(value: Profile | null) {
        if (this._player2 !== value) {
            this._player2 = value;
            this.notifyPropertyChange('player2', value);
        }
    }

    get player1Score(): number {
        return this._player1Score;
    }

    set player1Score(value: number) {
        if (this._player1Score !== value) {
            this._player1Score = value;
            this.notifyPropertyChange('player1Score', value);
        }
    }

    get player2Score(): number {
        return this._player2Score;
    }

    set player2Score(value: number) {
        if (this._player2Score !== value) {
            this._player2Score = value;
            this.notifyPropertyChange('player2Score', value);
        }
    }

    get canSubmitScore(): boolean {
        return this._canSubmitScore;
    }

    set canSubmitScore(value: boolean) {
        if (this._canSubmitScore !== value) {
            this._canSubmitScore = value;
            this.notifyPropertyChange('canSubmitScore', value);
        }
    }

    get canDispute(): boolean {
        return this._canDispute;
    }

    set canDispute(value: boolean) {
        if (this._canDispute !== value) {
            this._canDispute = value;
            this.notifyPropertyChange('canDispute', value);
        }
    }

    private updateActionStates() {
        if (!this._match) return;

        const currentUserId = 'current-user-id'; // Replace with actual user ID
        const isParticipant = 
            this._match.player1_id === currentUserId || 
            this._match.player2_id === currentUserId;

        this.canSubmitScore = 
            isParticipant && 
            this._match.status === 'in_progress';

        this.canDispute = 
            isParticipant && 
            this._match.status === 'completed';
    }

    async loadMatchDetails() {
        try {
            // Load match details
            const match = await MatchService.getMatchDetails(this.matchId);
            this.match = match;

            // Load tournament details
            this.tournament = await TournamentService.getTournamentDetails(match.tournament_id);

            // Load player profiles
            this.player1 = await ProfileService.getProfile(match.player1_id);
            this.player2 = await ProfileService.getProfile(match.player2_id);

            // Set initial scores if available
            if (match.player1_score !== null) this.player1Score = match.player1_score;
            if (match.player2_score !== null) this.player2Score = match.player2_score;

        } catch (error) {
            console.error('Failed to load match details:', error);
            alert({
                title: 'Error',
                message: 'Failed to load match details. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async submitScore() {
        if (!this._match) return;

        try {
            const winnerId = this.player1Score > this.player2Score 
                ? this._match.player1_id 
                : this._match.player2_id;

            await MatchService.submitMatchResult(
                this._match.id,
                this.player1Score,
                this.player2Score,
                winnerId
            );

            alert({
                title: 'Success',
                message: 'Match results submitted successfully!',
                okButtonText: 'OK'
            });

            await this.loadMatchDetails(); // Refresh the data
        } catch (error) {
            console.error('Failed to submit match results:', error);
            alert({
                title: 'Error',
                message: error.message || 'Failed to submit match results. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async disputeMatch() {
        if (!this._match) return;

        try {
            await MatchService.disputeMatch(this._match.id);
            alert({
                title: 'Match Disputed',
                message: 'The match has been marked as disputed. An admin will review the case.',
                okButtonText: 'OK'
            });
            await this.loadMatchDetails(); // Refresh the data
        } catch (error) {
            console.error('Failed to dispute match:', error);
            alert({
                title: 'Error',
                message: error.message || 'Failed to dispute match. Please try again.',
                okButtonText: 'OK'
            });
        }
    }
}