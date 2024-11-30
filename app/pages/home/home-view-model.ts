import { Observable, Frame } from '@nativescript/core';
import { TournamentService } from '../../services/tournament-service';
import { MatchService } from '../../services/match-service';
import { StatsService } from '../../services/stats-service';
import { authService } from '../../services/auth-service';
import type { Tournament, Match } from '../../services/supabase';

export class HomeViewModel extends Observable {
    private _winRate: number = 0;
    private _totalEarnings: number = 0;
    private _activeTournaments: Tournament[] = [];
    private _upcomingMatches: Match[] = [];

    constructor() {
        super();
        this.loadData();
    }

    get winRate(): number {
        return this._winRate;
    }

    set winRate(value: number) {
        if (this._winRate !== value) {
            this._winRate = value;
            this.notifyPropertyChange('winRate', value);
        }
    }

    get totalEarnings(): number {
        return this._totalEarnings;
    }

    set totalEarnings(value: number) {
        if (this._totalEarnings !== value) {
            this._totalEarnings = value;
            this.notifyPropertyChange('totalEarnings', value);
        }
    }

    get activeTournaments(): Tournament[] {
        return this._activeTournaments;
    }

    set activeTournaments(value: Tournament[]) {
        if (this._activeTournaments !== value) {
            this._activeTournaments = value;
            this.notifyPropertyChange('activeTournaments', value);
        }
    }

    get upcomingMatches(): Match[] {
        return this._upcomingMatches;
    }

    set upcomingMatches(value: Match[]) {
        if (this._upcomingMatches !== value) {
            this._upcomingMatches = value;
            this.notifyPropertyChange('upcomingMatches', value);
        }
    }

    async loadData() {
        try {
            const userId = authService.currentUser?.id;
            if (!userId) return;

            // Load user stats
            const stats = await StatsService.getUserStats(userId);
            this.winRate = stats.winRate;
            this.totalEarnings = stats.totalEarnings;

            // Load active tournaments
            this.activeTournaments = await TournamentService.listTournaments({
                status: 'in_progress'
            });

            // Load upcoming matches
            const matches = await MatchService.getUserMatches(userId);
            this.upcomingMatches = matches
                .filter(match => match.status === 'scheduled')
                .slice(0, 5); // Show only next 5 matches
        } catch (error) {
            console.error('Failed to load home data:', error);
        }
    }

    findMatch() {
        Frame.topmost().navigate('pages/matches/match-finder-page');
    }

    browseTournaments() {
        Frame.topmost().navigate('pages/tournaments/tournaments-page');
    }

    async logout() {
        try {
            await authService.signOut();
            Frame.topmost().navigate({
                moduleName: 'pages/auth/login-page',
                clearHistory: true
            });
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
        }
    }
}