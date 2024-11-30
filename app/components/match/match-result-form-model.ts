import { Observable } from '@nativescript/core';
import { MatchResultService } from '../../services/match-result-service';
import { ProfileService } from '../../services/profile-service';

export class MatchResultFormModel extends Observable {
  private _player1: any = null;
  private _player2: any = null;
  private _player1Score: number = 0;
  private _player2Score: number = 0;
  private _isSubmitting: boolean = false;

  constructor(
    private matchId: string,
    private player1Id: string,
    private player2Id: string,
    private onSubmitComplete?: () => void
  ) {
    super();
    this.loadPlayers();
  }

  get player1(): any {
    return this._player1;
  }

  set player1(value: any) {
    if (this._player1 !== value) {
      this._player1 = value;
      this.notifyPropertyChange('player1', value);
    }
  }

  get player2(): any {
    return this._player2;
  }

  set player2(value: any) {
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
      this.notifyPropertyChange('isValid', this.isValid);
    }
  }

  get player2Score(): number {
    return this._player2Score;
  }

  set player2Score(value: number) {
    if (this._player2Score !== value) {
      this._player2Score = value;
      this.notifyPropertyChange('player2Score', value);
      this.notifyPropertyChange('isValid', this.isValid);
    }
  }

  get isSubmitting(): boolean {
    return this._isSubmitting;
  }

  set isSubmitting(value: boolean) {
    if (this._isSubmitting !== value) {
      this._isSubmitting = value;
      this.notifyPropertyChange('isSubmitting', value);
    }
  }

  get isValid(): boolean {
    return (
      this.player1Score >= 0 &&
      this.player2Score >= 0 &&
      (this.player1Score !== this.player2Score)
    );
  }

  private async loadPlayers(): Promise<void> {
    try {
      const [player1, player2] = await Promise.all([
        ProfileService.getProfile(this.player1Id),
        ProfileService.getProfile(this.player2Id)
      ]);

      this.player1 = player1;
      this.player2 = player2;
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  async submitResult(): Promise<void> {
    if (!this.isValid || this.isSubmitting) return;

    try {
      this.isSubmitting = true;

      await MatchResultService.submitResult({
        matchId: this.matchId,
        player1Score: this.player1Score,
        player2Score: this.player2Score,
        winnerId: this.player1Score > this.player2Score ? this.player1Id : this.player2Id
      });

      if (this.onSubmitComplete) {
        this.onSubmitComplete();
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      alert({
        title: 'Error',
        message: 'Failed to submit match result. Please try again.',
        okButtonText: 'OK'
      });
    } finally {
      this.isSubmitting = false;
    }
  }
}