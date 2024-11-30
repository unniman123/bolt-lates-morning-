import { Observable, Frame } from '@nativescript/core';
import { supabase } from '../../services/supabase';
import { ProfileService } from '../../services/profile-service';

export class RegisterViewModel extends Observable {
    private _username: string = '';
    private _email: string = '';
    private _password: string = '';
    private _gameId: string = '';
    private _isLoading: boolean = false;

    constructor() {
        super();
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

    get email(): string {
        return this._email;
    }

    set email(value: string) {
        if (this._email !== value) {
            this._email = value;
            this.notifyPropertyChange('email', value);
        }
    }

    get password(): string {
        return this._password;
    }

    set password(value: string) {
        if (this._password !== value) {
            this._password = value;
            this.notifyPropertyChange('password', value);
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

    get isLoading(): boolean {
        return this._isLoading;
    }

    set isLoading(value: boolean) {
        if (this._isLoading !== value) {
            this._isLoading = value;
            this.notifyPropertyChange('isLoading', value);
        }
    }

    async onRegister() {
        if (!this.email || !this.password || !this.username) {
            alert({
                title: 'Error',
                message: 'Please fill in all required fields',
                okButtonText: 'OK'
            });
            return;
        }

        this.isLoading = true;

        try {
            // Register user with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: this.email,
                password: this.password
            });

            if (authError) throw authError;

            // Create user profile
            await ProfileService.createProfile({
                id: authData.user!.id,
                username: this.username,
                game_id: this.gameId || null,
                wallet_balance: 0
            });

            alert({
                title: 'Success',
                message: 'Registration successful! Please check your email to verify your account.',
                okButtonText: 'OK'
            });

            Frame.topmost().navigate({
                moduleName: 'pages/auth/login-page',
                clearHistory: true
            });
        } catch (error) {
            console.error('Registration error:', error);
            alert({
                title: 'Registration Failed',
                message: error.message || 'Failed to create account. Please try again.',
                okButtonText: 'OK'
            });
        } finally {
            this.isLoading = false;
        }
    }

    onBackToLogin() {
        Frame.topmost().goBack();
    }
}