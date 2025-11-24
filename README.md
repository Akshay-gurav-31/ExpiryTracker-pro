# Expiry Date Tracker

A premium, modern web application for tracking product expiry dates with real-time synchronization, built with Supabase and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🔐 **Email Authentication** - Secure signup/login with email verification
- 👤 **User Profiles** - Customizable profiles with avatar uploads
- 📊 **Real-time Sync** - Instant updates across all devices
- 🔔 **Smart Notifications** - Browser alerts for expiring items
- 📱 **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- 🌙 **Dark Mode** - Beautiful dark theme with glassmorphism effects
- 📸 **Image Upload** - Add photos of your items
- 📤 **Import/Export** - Backup and restore your data
- 🔍 **Smart Filtering** - View all, expiring soon, or expired items
- 🎨 **Premium UI** - Modern design with smooth animations

## 🚀 Getting Started

### Prerequisites

- A Supabase account ([Sign up here](https://supabase.com))
- A modern web browser
- A local web server (e.g., Live Server for VS Code)

### Database Setup

1. **Create a Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run the Database Schema**
   - Open your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy the contents of `database-schema.sql`
   - Execute the SQL commands

3. **Create Storage Buckets**
   
   **For Avatars:**
   - Go to Storage in Supabase dashboard
   - Create a new bucket named `avatars`
   - Make it **public**
   - Go to SQL Editor and run the storage policies (uncomment them in `database-schema.sql`)

   **For Item Images:**
   - Create another bucket named `items`
   - Make it **public**

4. **Configure Email Authentication**
   - Go to Authentication → Settings
   - Enable "Confirm email" under Email Auth
   - Set redirect URL to: `https://your-domain.com/login.html`
   - Customize email templates if desired

### Application Setup

1. **Clone or Download**
   ```bash
   git clone <your-repo-url>
   cd expiry-tracker
   ```

2. **Configure Supabase**
   - Your Supabase credentials are already configured in `config.js`
   - If needed, update the URL and anon key

3. **Run the Application**
   - Open `login.html` in your browser using a local web server
   - Or use Live Server extension in VS Code

## 📁 Project Structure

```
expiry-tracker/
├── login.html              # Login page (entry point)
├── signup.html             # User registration
├── dashboard.html          # Main application
├── profile.html            # User profile management
├── config.js               # Supabase configuration
├── auth.js                 # Authentication logic
├── dashboard.js            # Dashboard functionality
├── profile.js              # Profile management
├── utils.js                # Helper functions
├── notifications.js        # Notification system
├── style.css               # Global styles
├── database-schema.sql     # Database schema
├── styles/
│   ├── auth.css           # Authentication pages
│   ├── dashboard.css      # Dashboard styles
│   └── profile.css        # Profile page styles
└── README.md              # This file
```

## 🎯 Usage

### First Time Setup

1. **Sign Up**
   - Open `login.html`
   - Click "Sign up"
   - Enter your name, email, and password
   - Check your email for verification link
   - Click the verification link

2. **Login**
   - Return to `login.html`
   - Enter your verified email and password
   - Click "Sign In"

### Adding Items

1. Click the "Add Item" button
2. Fill in the item details:
   - Item name (required)
   - Category (optional)
   - Expiry date (required)
   - Quantity (default: 1)
   - Notes (optional)
   - Image (optional)
3. Click "Save Item"

### Managing Items

- **Edit**: Click the edit icon on any item card
- **Delete**: Click the delete icon on any item card
- **Filter**: Use the sidebar to filter by all, expiring soon, or expired

### Profile Management

1. Click your avatar in the sidebar
2. Select "Profile"
3. Update your name or avatar
4. Enable browser notifications
5. Click "Save Changes"

### Import/Export

- **Export**: Click "Export" to download your data as JSON
- **Import**: Click "Import" and select a JSON file to restore data

## 🔔 Notifications

The app will notify you about:
- Items expiring today
- Items expiring in 3 days
- Items expiring in 7 days

**To enable notifications:**
1. Go to your profile
2. Toggle "Browser Notifications"
3. Allow notifications when prompted

## 🎨 Design Features

- **Dark Mode**: Premium dark theme with vibrant gradients
- **Glassmorphism**: Frosted glass effects on cards and modals
- **Smooth Animations**: Micro-interactions for better UX
- **Responsive**: Optimized for all screen sizes
- **Accessibility**: Semantic HTML and ARIA labels

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Fonts**: Inter (Google Fonts)
- **Icons**: Custom SVG icons

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- User data is isolated and secure
- Email verification required
- Secure password hashing via Supabase Auth

## 🐛 Troubleshooting

### Email Verification Not Working
- Check your spam folder
- Verify email settings in Supabase dashboard
- Ensure redirect URL is correct

### Items Not Syncing
- Check browser console for errors
- Verify Supabase credentials in `config.js`
- Ensure you're logged in

### Images Not Uploading
- Verify storage buckets are created and public
- Check storage policies in Supabase
- Ensure file size is reasonable (< 5MB)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ using Supabase**
