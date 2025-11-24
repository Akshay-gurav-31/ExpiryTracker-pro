// Dashboard JavaScript - Real-time Item Management
import { supabase } from './config.js';
import { requireAuth, logout } from './auth.js';
import {
    formatDate,
    daysUntilExpiry,
    getExpiryStatus,
    compressImage,
    showToast,
    generateUniqueFilename
} from './utils.js';
import { initNotifications } from './notifications.js';

let currentUser = null;
let items = [];
let currentFilter = 'all';
let editingItemId = null;
let realtimeChannel = null;

// Initialize Dashboard
async function init() {
    currentUser = await requireAuth();
    if (!currentUser) return;

    // Show dashboard content after auth check
    document.querySelector('.dashboard-container').style.display = 'flex';

    await loadUserProfile();
    await loadItems();
    setupRealtimeSync();
    setupEventListeners();
    await initNotifications();
}

// Load User Profile
async function loadUserProfile() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        document.getElementById('userName').textContent = profile.name || 'User';
        document.getElementById('userEmail').textContent = currentUser.email;

        const avatarEl = document.getElementById('userAvatar');
        if (profile.avatar_url) {
            avatarEl.src = profile.avatar_url;
        } else {
            avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=667eea&color=fff`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load Items from Database
async function loadItems() {
    try {
        const { data, error } = await supabase
            .from('expiry_items')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('expiry_date', { ascending: true });

        if (error) throw error;

        items = data || [];
        renderItems();
        updateCounts();
    } catch (error) {
        console.error('Error loading items:', error);
        showToast('Failed to load items', 'error');
    }
}

// Setup Real-time Synchronization
function setupRealtimeSync() {
    realtimeChannel = supabase
        .channel('expiry_items_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'expiry_items',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                handleRealtimeChange(payload);
            }
        )
        .subscribe();
}

// Handle Real-time Changes
function handleRealtimeChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
        case 'INSERT':
            items.push(newRecord);
            showToast('New item added', 'success');
            break;
        case 'UPDATE':
            const updateIndex = items.findIndex(item => item.id === newRecord.id);
            if (updateIndex !== -1) {
                items[updateIndex] = newRecord;
                showToast('Item updated', 'info');
            }
            break;
        case 'DELETE':
            items = items.filter(item => item.id !== oldRecord.id);
            showToast('Item deleted', 'info');
            break;
    }

    renderItems();
    updateCounts();
}

// Render Items
function renderItems() {
    const grid = document.getElementById('itemsGrid');
    const emptyState = document.getElementById('emptyState');

    let filteredItems = items;

    // Apply filter
    if (currentFilter === 'soon') {
        filteredItems = items.filter(item => {
            const days = daysUntilExpiry(item.expiry_date);
            return days >= 0 && days <= 7;
        });
    } else if (currentFilter === 'expired') {
        filteredItems = items.filter(item => daysUntilExpiry(item.expiry_date) < 0);
    }

    if (filteredItems.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = filteredItems.map(item => createItemCard(item)).join('');

    // Add event listeners to cards
    filteredItems.forEach(item => {
        const card = document.querySelector(`[data-item-id="${item.id}"]`);
        if (card) {
            card.querySelector('.edit-btn')?.addEventListener('click', () => editItem(item));
            card.querySelector('.delete-btn')?.addEventListener('click', () => deleteItem(item.id));
        }
    });
}

// Create Item Card HTML
function createItemCard(item) {
    const status = getExpiryStatus(item.expiry_date);
    const imageUrl = item.image_url || 'https://via.placeholder.com/300x200?text=No+Image';

    return `
        <div class="item-card" data-item-id="${item.id}">
            <div class="item-image">
                <img src="${imageUrl}" alt="${item.name}">
                <span class="badge badge-${status.status}">${status.label}</span>
            </div>
            <div class="item-content">
                <div class="item-header">
                    <h3>${item.name}</h3>
                    ${item.category ? `<span class="category-tag">${item.category}</span>` : ''}
                </div>
                <div class="item-details">
                    <div class="detail-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Expires: ${formatDate(item.expiry_date)}</span>
                    </div>
                    ${item.quantity > 1 ? `
                    <div class="detail-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"/>
                            <line x1="8" y1="12" x2="21" y2="12"/>
                            <line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/>
                            <line x1="3" y1="12" x2="3.01" y2="12"/>
                            <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                        <span>Quantity: ${item.quantity}</span>
                    </div>
                    ` : ''}
                    ${item.notes ? `
                    <div class="detail-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <line x1="10" y1="9" x2="8" y2="9"/>
                        </svg>
                        <span>${item.notes}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-icon edit-btn" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete-btn" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Update Counts
function updateCounts() {
    const allCount = items.length;
    const soonCount = items.filter(item => {
        const days = daysUntilExpiry(item.expiry_date);
        return days >= 0 && days <= 7;
    }).length;
    const expiredCount = items.filter(item => daysUntilExpiry(item.expiry_date) < 0).length;

    document.getElementById('allCount').textContent = allCount;
    document.getElementById('soonCount').textContent = soonCount;
    document.getElementById('expiredCount').textContent = expiredCount;
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation filter
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            renderItems();
        });
    });

    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', openAddModal);

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('itemModal').addEventListener('click', (e) => {
        if (e.target.id === 'itemModal') closeModal();
    });

    // Form submission
    document.getElementById('itemForm').addEventListener('submit', saveItem);

    // Image upload
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        document.getElementById('itemImage').click();
    });
    document.getElementById('itemImage').addEventListener('change', handleImageSelect);

    // QR Scanner
    document.getElementById('scanQRBtn').addEventListener('click', scanQRCode);

    // Import/Export
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', handleImport);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // User profile toggle
    document.getElementById('userProfile').addEventListener('click', () => {
        document.getElementById('profileMenu').classList.toggle('active');
    });
}

// Open Add Modal
function openAddModal() {
    editingItemId = null;
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('itemModal').classList.add('active');
}

// Edit Item
function editItem(item) {
    editingItemId = item.id;
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemQuantity').value = item.quantity;
    document.getElementById('itemExpiryDate').value = item.expiry_date;
    document.getElementById('itemNotes').value = item.notes || '';

    if (item.image_url) {
        document.getElementById('imagePreview').innerHTML = `
            <img src="${item.image_url}" alt="Preview">
        `;
    }

    document.getElementById('itemModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('itemModal').classList.remove('active');
    editingItemId = null;
}

// Handle Image Selection
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('imagePreview').innerHTML = `
            <img src="${event.target.result}" alt="Preview">
        `;
    };
    reader.readAsDataURL(file);
}

// Save Item
async function saveItem(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
        const itemData = {
            name: document.getElementById('itemName').value.trim(),
            category: document.getElementById('itemCategory').value,
            quantity: parseInt(document.getElementById('itemQuantity').value),
            expiry_date: document.getElementById('itemExpiryDate').value,
            notes: document.getElementById('itemNotes').value.trim(),
            user_id: currentUser.id
        };

        // Upload image if selected
        const imageFile = document.getElementById('itemImage').files[0];
        if (imageFile) {
            const compressedImage = await compressImage(imageFile);
            const filename = generateUniqueFilename(imageFile.name);
            const filePath = `${currentUser.id}/${filename}`;

            const { error: uploadError } = await supabase.storage
                .from('items')
                .upload(filePath, compressedImage);

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    throw new Error('Storage bucket "items" not found. Please create it in your Supabase dashboard.');
                }
                throw new Error(`Image upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('items')
                .getPublicUrl(filePath);

            itemData.image_url = publicUrl;
        }

        if (editingItemId) {
            // Update existing item
            const { error } = await supabase
                .from('expiry_items')
                .update(itemData)
                .eq('id', editingItemId);

            if (error) throw error;
        } else {
            // Insert new item
            const { error } = await supabase
                .from('expiry_items')
                .insert([itemData]);

            if (error) throw error;
        }

        closeModal();
        // Real-time will handle the update
    } catch (error) {
        console.error('Error saving item:', error);
        showToast(error.message || 'Failed to save item', 'error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
}

// Delete Item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const { error } = await supabase
            .from('expiry_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;
        // Real-time will handle the update
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Failed to delete item', 'error');
    }
}

// QR Code Scanner (placeholder - requires camera library)
function scanQRCode() {
    showToast('QR Scanner feature coming soon!', 'info');
    // TODO: Implement QR scanner using a library like html5-qrcode
}

// Export Data as PDF
async function exportData() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Get user profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', currentUser.id)
            .single();

        const userName = profile?.name || 'User';
        const userEmail = currentUser.email;

        // PDF Styling
        const primaryColor = [102, 126, 234]; // #667eea
        const redColor = [239, 68, 68]; // Red for expired
        const grayColor = [107, 114, 128]; // Gray text

        // Header - Platform Name
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('ExpiryTracker', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Expiry Date Management System', 105, 25, { align: 'center' });

        // Date
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.setTextColor(...grayColor);
        doc.setFontSize(10);
        doc.text(`Generated on: ${currentDate}`, 14, 45);

        // User Details Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('User Information', 14, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grayColor);
        doc.text(`Name: ${userName}`, 14, 63);
        doc.text(`Email: ${userEmail}`, 14, 70);

        // Items Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Items List', 14, 82);

        // Prepare table data
        const tableData = items.map(item => {
            const days = daysUntilExpiry(item.expiry_date);
            const status = days < 0 ? 'Expired' : days === 0 ? 'Today' : days <= 7 ? `${days} days` : `${days} days`;
            const isExpired = days < 0;

            return {
                name: item.name,
                category: item.category || '-',
                quantity: item.quantity.toString(),
                expiryDate: formatDate(item.expiry_date),
                status: status,
                isExpired: isExpired
            };
        });

        // Create table
        doc.autoTable({
            startY: 88,
            head: [['Item Name', 'Category', 'Qty', 'Expiry Date', 'Status']],
            body: tableData.map(row => [
                row.name,
                row.category,
                row.quantity,
                row.expiryDate,
                row.status
            ]),
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 35 },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 40 },
                4: { cellWidth: 35, halign: 'center' }
            },
            didParseCell: function (data) {
                // Color expired items in red
                if (data.section === 'body') {
                    const rowData = tableData[data.row.index];
                    if (rowData.isExpired) {
                        data.cell.styles.textColor = redColor;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            margin: { left: 14, right: 14 },
            theme: 'striped',
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
            doc.text(
                'ExpiryTracker - Track your expiry dates efficiently',
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 5,
                { align: 'center' }
            );
        }

        // Save PDF
        const filename = `ExpiryTracker_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);

        showToast('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showToast('Failed to export PDF', 'error');
    }
}

// Import Data
function importData() {
    document.getElementById('importFile').click();
}

// Handle Import
async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importedItems = JSON.parse(text);

        if (!Array.isArray(importedItems)) {
            throw new Error('Invalid data format');
        }

        // Insert imported items
        const itemsToInsert = importedItems.map(item => ({
            name: item.name,
            category: item.category,
            quantity: item.quantity || 1,
            expiry_date: item.expiry_date,
            notes: item.notes,
            user_id: currentUser.id
        }));

        const { error } = await supabase
            .from('expiry_items')
            .insert(itemsToInsert);

        if (error) throw error;

        showToast(`Imported ${itemsToInsert.length} items successfully`, 'success');
    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Failed to import data', 'error');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
});

// Initialize on page load
init();
