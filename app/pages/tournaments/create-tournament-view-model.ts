import { Observable, Frame } from '@nativescript/core';
import { TournamentService } from '../../services/tournament-service';
import { PrizePoolCalculator } from '../../utils/prize-pool-calculator';
import { authService } from '../../services/auth-service';

export class CreateTournamentViewModel extends Observable {
    private _title: string = '';
    private _gameType: string = '';
    private _entryFee: number = 5;
    private _maxParticipants: number = 8;
    private _startTime: Date = new Date();
    private prizePoolCalculator: PrizePoolCalculator;

    constructor() {
        super();
        this.prizePoolCalculator = new PrizePoolCalculator();
        this.updatePrizePool();
    }

    get title(): string {
        return this._title;
    }

    set title(value: string) {
        if (this._title !== value) {
            this._title = value;
            this.notifyPropertyChange('title', value);
            this.notifyPropertyChange('isValid');
        }
    }

    get gameType(): string {
        return this._gameType;
    }

    set gameType(value: string) {
        if (this._gameType !== value) {
            this._gameType = value;
            this.notifyPropertyChange('gameType', value);
            this.notifyPropertyChange('isValid');
        }
    }

    get entryFee(): number {
        return this._entryFee;
    }

    set entryFee(value: number) {
        if (this._entryFee !== value) {
            this._entryFee = value;
            this.notifyPropertyChange('entryFee', value);
            this.updatePrizePool();
            this.notifyPropertyChange('isValid');
        }
    }

    get maxParticipants(): number {
        return this._maxParticipants;
    }

    set maxParticipants(value: number) {
        if (this._maxParticipants !== value) {
            this._maxParticipants = value;
            this.notifyPropertyChange('maxParticipants', value);
            this.updatePrizePool();
            this.notifyPropertyChange('isValid');
        }
    }

    get startTime(): Date {
        return this._startTime;
    }

    set startTime(value: Date) {
        if (this._startTime !== value) {
            this._startTime = value;
            this.notifyPropertyChange('startTime', value);
            this.notifyPropertyChange('isValid');
        }
    }

    get totalPrizePool(): number {
        return this.prizePoolCalculator.calculateTotal(this.entryFee, this.maxParticipants);
    }

    get firstPlacePrize(): number {
        return this.prizePoolCalculator.calculatePrize(this.totalPrizePool, 1);
    }

    get secondPlacePrize(): number {
        return this.prizePoolCalculator.calculatePrize(this.totalPrizePool, 2);
    }

    get thirdPlacePrize(): number {
        return this.prizePoolCalculator.calculatePrize(this.totalPrizePool, 3);
    }

    get isValid(): boolean {
        return (
            this.title.length >= 3 &&
            this.gameType !== '' &&
            this.entryFee >= 1 &&
            this.maxParticipants >= 4 &&
            this.startTime > new Date()
        );
    }

    selectGame(args: any) {
        const button = args.object;
        this.gameType = button.text;
    }

    private updatePrizePool() {
        this.notifyPropertyChange('totalPrizePool');
        this.notifyPropertyChange('firstPlacePrize');
        this.notifyPropertyChange('secondPlacePrize');
        this.notifyPropertyChange('thirdPlacePrize');
    }

    async createTournament() {
        if (!this.isValid) return;

        try {
            const tournament = await TournamentService.createTournament({
                title: this.title,
                game_type: this.gameType,
                entry_fee: this.entryFee,
                max_participants: this.maxParticipants,
                start_time: this.startTime.toISOString(),
                prize_pool: this.totalPrizePool,
                creator_id: authService.currentUser!.id,
                current_participants: 0,
                status: 'open'
            });

            alert({
                title: 'Success',
                message: 'Tournament created successfully!',
                okButtonText: 'OK'
            });

            Frame.topmost().goBack();
        } catch (error) {
            console.error('Failed to create tournament:', error);
            alert({
                title: 'Error',
                message: 'Failed to create tournament. Please try again.',
                okButtonText: 'OK'
            });
        }
    }
}