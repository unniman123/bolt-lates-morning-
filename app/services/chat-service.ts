import { supabase } from './supabase';
import { Observable } from '@nativescript/core';

interface ChatMessage {
    id: string;
    match_id: string;
    user_id: string;
    message: string;
    created_at: string;
}

export class ChatService extends Observable {
    private static instance: ChatService;
    private _messages: Map<string, ChatMessage[]> = new Map();
    private subscriptions: Map<string, any> = new Map();

    private constructor() {
        super();
    }

    static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    subscribeToMatchChat(matchId: string) {
        if (this.subscriptions.has(matchId)) return;

        const subscription = supabase
            .channel(`match_chat:${matchId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `match_id=eq.${matchId}`
            }, payload => {
                this.handleNewMessage(matchId, payload.new as ChatMessage);
            })
            .subscribe();

        this.subscriptions.set(matchId, subscription);
    }

    unsubscribeFromMatchChat(matchId: string) {
        const subscription = this.subscriptions.get(matchId);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(matchId);
        }
    }

    private handleNewMessage(matchId: string, message: ChatMessage) {
        const messages = this._messages.get(matchId) || [];
        messages.push(message);
        this._messages.set(matchId, messages);
        this.notifyPropertyChange(`messages_${matchId}`, messages);
    }

    async getMatchMessages(matchId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        this._messages.set(matchId, data);
        return data;
    }

    async sendMessage(matchId: string, userId: string, message: string): Promise<ChatMessage> {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([{
                match_id: matchId,
                user_id: userId,
                message
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}