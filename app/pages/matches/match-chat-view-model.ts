import { Observable } from '@nativescript/core';
import { ChatService } from '../../services/chat-service';
import { authService } from '../../services/auth-service';

export class MatchChatViewModel extends Observable {
    private _messages: any[] = [];
    private _messageText: string = '';
    private chatService: ChatService;
    private matchId: string;

    constructor(matchId: string) {
        super();
        this.matchId = matchId;
        this.chatService = ChatService.getInstance();
        this.loadMessages();
        this.chatService.subscribeToMatchChat(matchId);
    }

    get messages(): any[] {
        return this._messages;
    }

    set messages(value: any[]) {
        if (this._messages !== value) {
            this._messages = value;
            this.notifyPropertyChange('messages', value);
        }
    }

    get messageText(): string {
        return this._messageText;
    }

    set messageText(value: string) {
        if (this._messageText !== value) {
            this._messageText = value;
            this.notifyPropertyChange('messageText', value);
        }
    }

    get currentUserId(): string {
        return authService.currentUser?.id || '';
    }

    async loadMessages() {
        try {
            this.messages = await this.chatService.getMatchMessages(this.matchId);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    async sendMessage() {
        if (!this.messageText.trim()) return;

        try {
            await this.chatService.sendMessage(
                this.matchId,
                this.currentUserId,
                this.messageText.trim()
            );
            this.messageText = '';
        } catch (error) {
            console.error('Failed to send message:', error);
            alert({
                title: 'Error',
                message: 'Failed to send message. Please try again.',
                okButtonText: 'OK'
            });
        }
    }

    onUnloaded() {
        this.chatService.unsubscribeFromMatchChat(this.matchId);
    }
}