import { Observable, Frame } from '@nativescript/core';
import { supabase } from '../../services/supabase';

export class LoginViewModel extends Observable {
    private _email: string = '';
    private _password: string = '';
    private _isLoading: boolean = false;

    constructor() {
        super();
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

    get isLoading(): boolean {
        return this._isLoading;
    }

    set isLoading(value: boolean) {
        if (this._isLoading !== value) {
            this._isLoading = value;
            this.notifyPropertyChange('isLoading', value);
        }
    }

    async onLogin() {
        if (!this.email || !this.password) {
            alert('Please enter email and password');
            return;
        }

        this.isLoading = true;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: this.email,
                password: this.password
            });

            if (error) throw error;

            // Navigate to home page on success
            Frame.topmost().navigate({
                moduleName: 'pages/home/home-page',
                clearHistory: true
            });
        } catch (error) {
            console.error('Login error:', error.message);
            alert('Login failed: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    onRegister() {
        Frame.topmost().navigate('pages/auth/register-page');
    }
}