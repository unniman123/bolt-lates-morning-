import { supabase } from './supabase';
import { Observable } from '@nativescript/core';

interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'match_invite' | 'tournament_start' | 'match_result' | 'prize_won';
    read: boolean;
    created_at: string;
}

export class NotificationService extends Observable {
    private static instance: NotificationService;
    private _notifications: Notification[] = [];
    private subscription: any;

    private constructor() {
        super();
        this.setupRealtimeSubscription();
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private setupRealtimeSubscription() {
        this.subscription = supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications'
            }, payload => {
                this.handleNewNotification(payload.new as Notification);
            })
            .subscribe();
    }

    private handleNewNotification(notification: Notification) {
        this._notifications.unshift(notification);
        this.notifyPropertyChange('notifications', this._notifications);
        
        // Show native notification
        if (global.isAndroid) {
            const context = global.android.foregroundActivity || global.android.startActivity;
            const builder = new android.app.Notification.Builder(context)
                .setContentTitle(notification.title)
                .setContentText(notification.message)
                .setSmallIcon(android.R.drawable.ic_dialog_info);
            
            const notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            notificationManager.notify(1, builder.build());
        } else if (global.isIOS) {
            const content = UNMutableNotificationContent.new();
            content.title = notification.title;
            content.body = notification.message;
            
            const trigger = UNTimeIntervalNotificationTrigger.triggerWithTimeIntervalRepeats(1, false);
            const request = UNNotificationRequest.requestWithIdentifierContentTrigger(
                notification.id,
                content,
                trigger
            );
            
            UNUserNotificationCenter.currentNotificationCenter().addNotificationRequest(request);
        }
    }

    async getNotifications(userId: string): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        this._notifications = data;
        return data;
    }

    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    }

    async createNotification(notification: Partial<Notification>): Promise<Notification> {
        const { data, error } = await supabase
            .from('notifications')
            .insert([notification])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}