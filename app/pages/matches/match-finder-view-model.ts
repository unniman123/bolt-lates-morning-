import { Observable, Frame } from '@nativescript/core';
import { MatchService } from '../../services/match-service';
import { ProfileService } from '../../services/profile-service';
import { authService } from '../../services/auth-service';
import type { Profile } from '../../services/supabase';

interface PlayerWithStats extends Profile {
    win_rate: number;
}

export class MatchFinderViewModel extends Observable {
    private _selectedGame: string = '';
    private _entryFee: number = 0;
    private _isSearching: boolean = false;
    private _availablePlayers: PlayerWithStats[] = [];
    private searchInterval: any;

    constructor() {
        super();
    }

    get selectedGame(): string {
        return this._selectedGame;
    }

    set selectedGame(value: string) {
        if (this._selectedGame !== value) {
            this._selectedGame = value;
            this.notifyPropertyChange('selectedGame', value);
            this.searchPlayers();
        }
    }

    get entryFee(): number {
        return this._entryFee;
    }

    set entryFee(value: number) {
        if (this._entryFee !== value) {
            this._entryFee = value;
            this.notifyPropertyChange('entryFee', value);
            this.searchPlayers();
        }
    }

    get isSearching(): boolean {
        return this._isSearching;
    }

    set isSearching(value: boolean) {
        if (this._isSearching !== value) {
            this._isSearching = value;
            this.notifyPropertyChange('isSearching', value);
        }
    }

    get availablePlayers(): PlayerWithStats[] {
        return this._availablePlayers;
    }

    set availablePlayers(value: PlayerWithStats[]) {
        if (this._availablePlayers !== value) {
            this._availablePlayers = value;
            this.notifyPropertyChange('availablePlayers', value);
        }
    }

    selectGame(args: any) {
        const button = args.object;
        this.selectedGame = button.text;
    }

    selectFee(args: any) {
        const button = args.object;
        this.entryFee = parseInt(button.text.replace('$', ''));
    }

    async searchPlayers() {
        if (!this.selectedGame || this.entryFee <= 0) return;

        try {
            const players = await MatchService.findAvailablePlayers({
                gameType: this.selectedGame,
                entryFee: this.entryFee
            });
            this.availablePlayers = players;
        } catch (error) {
            console.error('Failed to search players:', error);
        }
    }

    async onChallenge(args: any) {
        const player = this.availablePlayers[args.index];
        try {
            const match = await MatchService.createChallenge({
                challengerId: authService.currentUser!.id,
                opponentId: player.id,
                gameType: this.selectedGame,
                entryFee: this.entryFee
            });

            Frame.topmost().navigate({
                moduleName: 'pages/matches/match-detail-page',
                context: { matchId: match.id }
            });
        } catch (error) {
            console.error('Failed to create challenge:', error);
            alert({
                title: 'Error',
                message: 'Failed to create challenge. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    toggleSearch() {
        this.isSearching = !this.isSearching;
        
        if (this.isSearching) {
            this.startQuickMatch();
        } else {
            this.cancelQuickMatch();
        }
    }

    private startQuickMatch() {
        // Poll for match every 5 seconds
        this.searchInterval = setInterval(async () => {
            try {
                const match = await MatchService.findQuickMatch({
                    userId: authService.currentUser!.id,
                    gameType: this.selectedGame,
                    entryFee: this.entryFee
                });

                if (match) {
                    clearInterval(this.searchInterval);
                    this.isSearching = false;
                    
                    Frame.topmost().navigate({
                        moduleName: 'pages/matches/match-detail-page',
                        context: { matchId: match.id }
                    });
                }
            } catch (error) {
                console.error('Quick match error:', error);
            }
        }, 5000);
    }

    private cancelQuickMatch() {
        if (this.searchInterval) {
            clearInterval(this.searchInterval);
        }
    }
}