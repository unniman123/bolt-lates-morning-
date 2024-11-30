import { Observable } from '@nativescript/core';
import { supabase } from './supabase';
import { ProfileService } from './profile-service';

interface MatchmakingCriteria {
  gameType: string;
  entryFee: number;
  ratingRange: number;
}

interface QueuedPlayer {
  id: string;
  rating: number;
  gameType: string;
  entryFee: number;
  queuedAt: Date;
}

export class MatchmakingService extends Observable {
  private static instance: MatchmakingService;
  private queuedPlayers: Map<string, QueuedPlayer> = new Map();
  private matchmakingInterval: any;
  private readonly QUEUE_TIMEOUT = 300000; // 5 minutes
  private readonly RATING_EXPANSION_RATE = 50; // Points per 30 seconds

  private constructor() {
    super();
    this.startMatchmakingLoop();
  }

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  async queuePlayer(playerId: string, criteria: MatchmakingCriteria): Promise<void> {
    const profile = await ProfileService.getProfile(playerId);
    if (!profile) throw new Error('Player profile not found');

    const queuedPlayer: QueuedPlayer = {
      id: playerId,
      rating: profile.rating || 1000,
      gameType: criteria.gameType,
      entryFee: criteria.entryFee,
      queuedAt: new Date()
    };

    this.queuedPlayers.set(playerId, queuedPlayer);
    this.notifyPropertyChange('queueSize', this.queuedPlayers.size);
  }

  dequeuePlayer(playerId: string): void {
    this.queuedPlayers.delete(playerId);
    this.notifyPropertyChange('queueSize', this.queuedPlayers.size);
  }

  private startMatchmakingLoop(): void {
    this.matchmakingInterval = setInterval(() => {
      this.processQueue();
    }, 30000); // Check every 30 seconds
  }

  private async processQueue(): Promise<void> {
    const now = new Date();
    const playersArray = Array.from(this.queuedPlayers.values());

    // Remove timed-out players
    playersArray.forEach(player => {
      if (now.getTime() - player.queuedAt.getTime() > this.QUEUE_TIMEOUT) {
        this.dequeuePlayer(player.id);
      }
    });

    // Try to match players
    for (let i = 0; i < playersArray.length; i++) {
      const player1 = playersArray[i];
      if (!this.queuedPlayers.has(player1.id)) continue; // Player might have been matched already

      const timeInQueue = (now.getTime() - player1.queuedAt.getTime()) / 1000;
      const ratingRange = this.RATING_EXPANSION_RATE * (timeInQueue / 30);

      for (let j = i + 1; j < playersArray.length; j++) {
        const player2 = playersArray[j];
        if (!this.queuedPlayers.has(player2.id)) continue;

        if (this.isValidMatch(player1, player2, ratingRange)) {
          await this.createMatch(player1, player2);
          this.dequeuePlayer(player1.id);
          this.dequeuePlayer(player2.id);
          break;
        }
      }
    }
  }

  private isValidMatch(player1: QueuedPlayer, player2: QueuedPlayer, ratingRange: number): boolean {
    return player1.gameType === player2.gameType &&
           player1.entryFee === player2.entryFee &&
           Math.abs(player1.rating - player2.rating) <= ratingRange;
  }

  private async createMatch(player1: QueuedPlayer, player2: QueuedPlayer): Promise<void> {
    const { data: match, error } = await supabase
      .from('matches')
      .insert([{
        player1_id: player1.id,
        player2_id: player2.id,
        game_type: player1.gameType,
        entry_fee: player1.entryFee,
        status: 'scheduled',
        scheduled_time: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Notify players about the match
    // This could be implemented using a notification service
  }

  dispose(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
    }
  }
}

export const matchmakingService = MatchmakingService.getInstance();