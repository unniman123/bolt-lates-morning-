import { Observable } from '@nativescript/core';
import { WalletService } from '../../services/wallet-service';
import type { Transaction } from '../../services/supabase';

export class WalletViewModel extends Observable {
    private _balance: number = 0;
    private _transactions: Transaction[] = [];

    constructor() {
        super();
        this.loadWalletData();
    }

    get balance(): number {
        return this._balance;
    }

    set balance(value: number) {
        if (this._balance !== value) {
            this._balance = value;
            this.notifyPropertyChange('balance', value);
        }
    }

    get transactions(): Transaction[] {
        return this._transactions;
    }

    set transactions(value: Transaction[]) {
        if (this._transactions !== value) {
            this._transactions = value;
            this.notifyPropertyChange('transactions', value);
        }
    }

    async loadWalletData() {
        try {
            const userId = 'current-user-id'; // Replace with actual user ID
            this.balance = await WalletService.getBalance(userId);
            this.transactions = await WalletService.getTransactionHistory(userId);
        } catch (error) {
            console.error('Failed to load wallet data:', error);
            alert({
                title: 'Error',
                message: 'Failed to load wallet data. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    async onDeposit() {
        // Implement deposit flow
        alert({
            title: 'Coming Soon',
            message: 'Deposit functionality will be available soon.',
            okButtonText: 'OK'
        });
    }

    async onWithdraw() {
        // Implement withdrawal flow
        alert({
            title: 'Coming Soon',
            message: 'Withdrawal functionality will be available soon.',
            okButtonText: 'OK'
        });
    }
}