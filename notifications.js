// Browser Notification System
import { supabase } from './config.js';
import { daysUntilExpiry } from './utils.js';

let notificationPermission = 'default';

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermission = 'granted';
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        return permission === 'granted';
    }

    return false;
}

/**
 * Show browser notification
 */
export function showNotification(title, options = {}) {
    if (notificationPermission !== 'granted') {
        return;
    }

    const defaultOptions = {
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        ...options
    };

    new Notification(title, defaultOptions);
}

/**
 * Check for expiring items and send notifications
 */
export async function checkExpiringItems() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: items, error } = await supabase
            .from('expiry_items')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        items.forEach(item => {
            const days = daysUntilExpiry(item.expiry_date);

            // Notify for items expiring today
            if (days === 0) {
                showNotification('Item Expiring Today!', {
                    body: `${item.name} expires today!`,
                    tag: `expiry-${item.id}`,
                    requireInteraction: true
                });
            }
            // Notify for items expiring in 3 days
            else if (days === 3) {
                showNotification('Item Expiring Soon', {
                    body: `${item.name} expires in 3 days`,
                    tag: `expiry-${item.id}`
                });
            }
            // Notify for items expiring in 7 days
            else if (days === 7) {
                showNotification('Upcoming Expiry', {
                    body: `${item.name} expires in 1 week`,
                    tag: `expiry-${item.id}`
                });
            }
        });
    } catch (error) {
        console.error('Error checking expiring items:', error);
    }
}

/**
 * Initialize notification system
 */
export async function initNotifications() {
    const granted = await requestNotificationPermission();

    if (granted) {
        // Check immediately
        await checkExpiringItems();

        // Check every 6 hours
        setInterval(checkExpiringItems, 6 * 60 * 60 * 1000);

        // Check daily at 9 AM
        scheduleDailyCheck();
    }
}

/**
 * Schedule daily notification check at 9 AM
 */
function scheduleDailyCheck() {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(9, 0, 0, 0);

    // If 9 AM has passed today, schedule for tomorrow
    if (now > scheduledTime) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilCheck = scheduledTime - now;

    setTimeout(() => {
        checkExpiringItems();
        // Repeat daily
        setInterval(checkExpiringItems, 24 * 60 * 60 * 1000);
    }, timeUntilCheck);
}

/**
 * Get notification permission status
 */
export function getNotificationStatus() {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}
