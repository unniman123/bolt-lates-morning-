import { Observable } from '@nativescript/core';
import { supabase } from './supabase';
import { ProfileService } from './profile-service';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
}

class AuthService extends Observable {
  private static instance: AuthService;
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
  };

  private constructor() {
    super();
    this.setupAuthListener();
    this.checkInitialSession();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  get currentUser(): any {
    return this.state.user;
  }

  get isLoading(): boolean {
    return this.state.loading;
  }

  get error(): string | null {
    return this.state.error;
  }

  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates };
    Object.keys(updates).forEach(key => {
      this.notifyPropertyChange(key, this.state[key as keyof AuthState]);
    });
  }

  private async setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      this.setState({
        isAuthenticated: !!session,
        user: session?.user || null,
        loading: false
      });

      if (event === 'SIGNED_IN') {
        try {
          await this.ensureUserProfile(session!.user);
        } catch (error) {
          console.error('Error ensuring user profile:', error);
        }
      }
    });
  }

  private async checkInitialSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      this.setState({
        isAuthenticated: !!session,
        user: session?.user || null,
        loading: false
      });

      if (session?.user) {
        await this.ensureUserProfile(session.user);
      }
    } catch (error) {
      this.setState({
        loading: false,
        error: 'Failed to check authentication status'
      });
    }
  }

  private async ensureUserProfile(user: any) {
    try {
      const profile = await ProfileService.getProfile(user.id);
      if (!profile) {
        await ProfileService.createProfile({
          id: user.id,
          username: user.email?.split('@')[0] || `user_${Date.now()}`,
          wallet_balance: 0
        });
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }

  async signUp(email: string, password: string, username: string): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        await ProfileService.createProfile({
          id: data.user.id,
          username,
          wallet_balance: 0
        });
      }
    } catch (error: any) {
      this.setState({ error: error.message });
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (error: any) {
      this.setState({ error: error.message });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      this.setState({ error: error.message });
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      this.setState({ error: error.message });
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
    } catch (error: any) {
      this.setState({ error: error.message });
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();