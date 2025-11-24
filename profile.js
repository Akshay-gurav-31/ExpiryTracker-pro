// Profile Management
import { supabase } from './config.js';
import { requireAuth } from './auth.js';
import { compressImage, showToast, generateUniqueFilename, daysUntilExpiry } from './utils.js';
import { requestNotificationPermission, getNotificationStatus } from './notifications.js';

let currentUser = null;
let currentProfile = null;
let realtimeChannel = null;

// Initialize Profile Page
async function init() {
    currentUser = await requireAuth();
    if (!currentUser) return;

    // Show profile content after auth check
    document.querySelector('.profile-container').style.display = 'block';

    await loadProfile();
    await loadStats();
    setupRealtimeSync();
    setupEventListeners();
    updateNotificationStatus();
}

// Load User Profile
async function loadProfile() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        currentProfile = profile;

        // Populate form
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = currentUser.email;

        // Set avatar
        const avatarEl = document.getElementById('avatarPreview');
        if (profile.avatar_url) {
            avatarEl.src = profile.avatar_url;
        } else {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=667eea&color=fff&size=200`;
        }

        // Set notification preference
        const notificationStatus = getNotificationStatus();
        document.getElementById('notificationsEnabled').checked = notificationStatus === 'granted';

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

// Setup Real-time Synchronization
function setupRealtimeSync() {
    realtimeChannel = supabase
        .channel('expiry_items_stats')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'expiry_items',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                // Update stats in real-time whenever items change
                loadStats();
            }
        )
        .subscribe();
}

// Load Statistics
async function loadStats() {
    try {
        const { data: items, error } = await supabase
            .from('expiry_items')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        const totalItems = items.length;
        const expiringSoon = items.filter(item => {
            const days = daysUntilExpiry(item.expiry_date);
            return days >= 0 && days <= 7;
        }).length;
        const expiredItems = items.filter(item => daysUntilExpiry(item.expiry_date) < 0).length;

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('expiringSoon').textContent = expiringSoon;
        document.getElementById('expiredItems').textContent = expiredItems;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Avatar upload
    document.getElementById('editAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });

    document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);

    // Profile form
    document.getElementById('profileForm').addEventListener('submit', saveProfile);

    // Notification toggle
    document.getElementById('notificationsEnabled').addEventListener('change', handleNotificationToggle);
}

// Handle Avatar Upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('avatarPreview').src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Compress and upload
        const compressedImage = await compressImage(file, 400, 0.9);
        const filename = generateUniqueFilename(file.name);
        const filePath = `${currentUser.id}/${filename}`;

        // Delete old avatar if exists
        if (currentProfile.avatar_url) {
            const oldPath = currentProfile.avatar_url.split('/').slice(-2).join('/');
            await supabase.storage.from('avatars').remove([oldPath]);
        }

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, compressedImage);

        if (uploadError) {
            if (uploadError.message.includes('Bucket not found')) {
                throw new Error('Storage bucket "avatars" not found. Please create it in your Supabase dashboard.');
            }
            throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUser.id);

        if (updateError) throw updateError;

        currentProfile.avatar_url = publicUrl;
        showToast('Avatar updated successfully', 'success');

    } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast('Failed to upload avatar', 'error');
    }
}

// Save Profile
async function saveProfile(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
        const name = document.getElementById('profileName').value.trim();

        if (!name) {
            showToast('Please enter your name', 'error');
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ name })
            .eq('id', currentUser.id);

        if (error) throw error;

        showToast('Profile updated successfully', 'success');

    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Failed to save profile', 'error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
}

// Handle Notification Toggle
async function handleNotificationToggle(e) {
    if (e.target.checked) {
        const granted = await requestNotificationPermission();
        if (!granted) {
            e.target.checked = false;
            showToast('Notification permission denied', 'error');
        } else {
            showToast('Notifications enabled', 'success');
        }
    }
    updateNotificationStatus();
}

// Update Notification Status Display
function updateNotificationStatus() {
    const status = getNotificationStatus();
    const statusEl = document.getElementById('notificationStatus');

    if (status === 'granted') {
        statusEl.innerHTML = `
            <div class="status-message success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Notifications are enabled
            </div>
        `;
    } else if (status === 'denied') {
        statusEl.innerHTML = `
            <div class="status-message error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Notifications are blocked. Please enable them in your browser settings.
            </div>
        `;
    } else {
        statusEl.innerHTML = `
            <div class="status-message info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Enable notifications to get alerts about expiring items
            </div>
        `;
    }
}

// Cleanup function
function cleanup() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// Initialize on page load
init();
