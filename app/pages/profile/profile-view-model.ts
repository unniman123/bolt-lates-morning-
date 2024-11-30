import { Observable } from '@nativescript/core';
import { ProfileService } from '../../services/profile-service';
import { MatchService } from '../../services/match-service';
import type { Profile, Match } from '../../services/supabase';

interface MatchHistoryItem {
    opponent: string;
    tournament: string;
    result: 'Won' | 'Lost';
    created_at: string;
}

export class ProfileViewModel extends Observable {
    private _profile: Profile | null = null;
    private _username: string = '';
    private _gameId: string = '';
    private _matchHistory: MatchHistoryItem[] = [];

    constructor() {
        super();
        this.loadProfile();
    }

    get profile(): Profile | null {
        return this._profile;
    }

    set profile(value: Profile | null) {
        if (this._profile !== value) {
            this._profile = value;
            if (value) {
                this.username = value.username;
                this.gameId = value.game_id || '';
            }
            this.notifyPropertyChange('profile', value);
        }
    }

    get username(): string {
        return this._username;
    }

    set username(value: string) {
        if (this._username !== value) {
            this._username = value;
            this.notifyPropertyChange('username', value);
        }
    }

    get gameId(): string {
        return this._gameId;
    }

    set gameId(value: string) {
        if (this._gameId !== value) {
            this._gameId = value;
            this.notifyPropertyChange('gameId', value);
        }
    }

    get matchHistory(): MatchHistoryItem[] {
        return this._matchHistory;
    }

    set matchHistory(value: MatchHistoryItem[]) {
        if (this._matchHistory !== value) {
            this._matchHistory = value;
            this.notifyPropertyChange('matchHistory', value);
        }
    }

    async loadProfile() {
        try {
            const userId = 'current-user-id'; // Replace with actual user ID
            this.profile = await ProfileService.getProfile(userId);
            await this.loadMatchHistory();
        } catch (error) {
            console.error('Failed to load profile:', error);
            alert({
                title: 'Error',
                message: 'Failed to load profile. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async loadMatchHistory() {
        try {
            const userId = 'current-user-id'; // Replace with actual user ID
            const matches = await MatchService.getUserMatches(userId);
            this.matchHistory = await this.processMatchHistory(matches);
        } catch (error) {
            console.error('Failed to load match history:', error);
            alert({
                title: 'Error',
                message: 'Failed to load match history. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    private async processMatchHistory(matches: Match[]): Promise<MatchHistoryItem[]> {
        const userId = 'current-user-id'; // Replace with actual user ID
        const historyItems: MatchHistoryItem[] = [];

        for (const match of matches) {
            const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
            const opponent = await ProfileService.getProfile(opponentId);
            
            historyItems.push({
                opponent: opponent?.username || 'Unknown Player',
                tournament: 'Tournament', // You might want to load tournament details here
                result: match.winner_id === userId ? 'Won' : 'Lost',
                created_at: match.created_at
            });
        }

        return historyItems;
    }

    async updateProfile() {
        if (!this._profile) return;

        try {
            const updates = {
                username: this.username,
                game_id: this.gameId
            };

            await ProfileService.updateProfile(this._profile.id, updates);
            
            alert({
                title: 'Success',
                message: 'Profile updated successfully!',
                okButtonText: 'OK'
            });
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert({
                title: 'Error',
                message: error.message || 'Failed to update profile. Please try again.',
                okButtonText: 'OK'
            });
        }
    }
}