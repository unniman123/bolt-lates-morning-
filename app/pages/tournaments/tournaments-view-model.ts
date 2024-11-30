import { Observable } from '@nativescript/core';
import { TournamentService } from '../../services/tournament-service';
import type { Tournament } from '../../services/supabase';

export class TournamentsViewModel extends Observable {
    private _tournaments: Tournament[] = [];
    private _currentFilter: string = 'all';

    constructor() {
        super();
        this.loadTournaments();
    }

    get tournaments(): Tournament[] {
        return this._tournaments;
    }

    set tournaments(value: Tournament[]) {
        if (this._tournaments !== value) {
            this._tournaments = value;
            this.notifyPropertyChange('tournaments', value);
        }
    }

    async loadTournaments() {
        try {
            const filters = this._currentFilter !== 'all' 
                ? { status: this._currentFilter as 'open' | 'in_progress' | 'completed' }
                : undefined;

            this.tournaments = await TournamentService.listTournaments(filters);
        } catch (error) {
            console.error('Failed to load tournaments:', error);
            alert({
                title: 'Error',
                message: 'Failed to load tournaments. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async filterByStatus(args: any) {
        const button = args.object;
        this._currentFilter = button.text.toLowerCase().replace(' ', '_');
        await this.loadTournaments();
    }

    onTournamentTap(args: any) {
        const tournament = this._tournaments[args.index];
        const frame = require('@nativescript/core').Frame;
        frame.topmost().navigate({
            moduleName: 'pages/tournaments/tournament-detail-page',
            context: { tournamentId: tournament.id }
        });
    }

    createTournament() {
        const frame = require('@nativescript/core').Frame;
        frame.topmost().navigate('pages/tournaments/create-tournament-page');
    }
}