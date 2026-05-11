# Deployment Guide

> Version: 2.3.0 | Last Updated: 2026-05-11

This guide covers deploying Oriental to various platforms.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Firebase Setup](#firebase-setup)
- [EmailJS Setup](#emailjs-setup)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Netlify](#netlify)
  - [GitHub Pages](#github-pages)
  - [Firebase Hosting](#firebase-hosting)
  - [Self-Hosting](#self-hosting)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [GitHub](https://github.com) account
- [Firebase](https://firebase.google.com) account (Spark free tier works)
- [EmailJS](https://www.emailjs.com) account (free: 200 emails/month)
- Modern web browser

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** → name it `Oriental`
3. Enable Google Analytics (optional)
4. Click **"Create Project"**

### 2. Enable Services

**Authentication:**
1. Build → Authentication → Get Started
2. Enable **Email/Password** and **Google** sign-in methods
3. Add your deployment domains under Authorized Domains

**Firestore Database:**
1. Build → Firestore Database → Create Database
2. Choose "Start in production mode"
3. Select a location closest to your users

### 3. Register Web App

1. Project Overview → Add app → Web (</>)
2. Name: `Oriental Web`
3. Copy the `firebaseConfig` object
4. Paste into `js/firebase-config.js`

### 4. Deploy Security Rules

Navigate to Firestore Database → Rules and deploy:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    match /organizations/{orgId} {
      allow read, write: if isAuthenticated() && 
        request.auth.uid in resource.data.members;
    }
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## EmailJS Setup

1. Go to [EmailJS](https://www.emailjs.com/) → Sign up
2. **Email Services** → Add New Service → Connect your email
3. Note the **Service ID**
4. **Email Templates** → Create these templates:

| Template | Subject | Used For |
|----------|---------|----------|
| `oriental_invite` | Invitation to join | Team invitations |
| `task_assigned` | New Task Assigned | Task assignments |
| `comment_on_task` | New Comment | Comment notifications |
| `mention_notification` | You were mentioned | @mention alerts |

5. **Account → API Keys** → Copy Public Key
6. Update in `dashboard-core.js`:
```javascript
emailjs.init('YOUR_PUBLIC_KEY');
```

---

## Deployment Options

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
3. **Add New → Project** → Select `oriental` repo
4. Configure:
   - Framework Preset: **Other**
   - Build Command: *(leave blank)*
   - Output Directory: *(leave blank)*
5. Click **Deploy**
6. Add your Vercel URL (e.g., `oriental.vercel.app`) to Firebase Authorized Domains

**Custom Domain:**
1. Project Settings → Domains → Add domain
2. Update DNS records as instructed

### Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com) → Import from Git
3. Select repository
4. Build command: *(leave blank)*
5. Publish directory: `.`
6. Click **Deploy site**

### GitHub Pages

1. Push code to GitHub
2. Repository Settings → Pages
3. Source: Deploy from branch → `main` → `/ (root)`
4. Site available at `https://yourusername.github.io/oriental`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: .
# Configure as SPA: No
firebase deploy --only hosting
```

### Self-Hosting

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .

# Docker
docker build -t oriental .
docker run -p 80:80 oriental
```

---

## Post-Deployment Checklist

### Core Functionality
- [ ] Can sign up with email/password
- [ ] Can sign in with Google
- [ ] Organization creation works
- [ ] Can create projects with colors
- [ ] 5-column board renders correctly
- [ ] Drag-and-drop moves tasks between columns
- [ ] Milestones can be added and toggled
- [ ] Real-time updates sync across tabs

### Role-Based Access
- [ ] Admin can manage team members
- [ ] Manager can create tasks and sprints
- [ ] Member can complete tasks and comment
- [ ] Viewer can only view content

### Internationalization
- [ ] English displays correctly
- [ ] Arabic displays with RTL layout
- [ ] Language switcher works

### UI/UX
- [ ] Dark mode toggles correctly
- [ ] Loading screen shows on initial load
- [ ] Floating shapes animate in background
- [ ] Mobile responsive (test at 375px width)
- [ ] Sidebar collapses on mobile
- [ ] Bottom navigation works

### PWA
- [ ] Service worker registers
- [ ] Manifest loads
- [ ] Install prompt appears
- [ ] Offline page shows when disconnected

### Reports
- [ ] All 8 charts render
- [ ] Date range filter works
- [ ] CSV export downloads correctly
- [ ] Project health table populates

### Email
- [ ] Invitation emails send
- [ ] Task assignment notifications work

---

## Project File Structure (v2.3.0)

```
oriental/
├── index.html
├── login.html
├── dashboard.html
├── offline.html
├── manifest.json
├── sw.js
├── css/
│   ├── main.css
│   ├── variables.css
│   ├── themes.css
│   ├── reset.css
│   ├── animations.css
│   ├── buttons.css
│   ├── forms.css
│   ├── layout.css
│   ├── components.css
│   ├── views.css
│   ├── utilities.css
│   ├── responsive.css
│   ├── effects.css
│   ├── login.css
│   ├── confetti.css
│   └── fab.css
├── js/
│   ├── firebase-config.js
│   ├── dashboard-core.js
│   ├── dashboard-projects.js
│   ├── dashboard-tasks.js
│   ├── dashboard-board.js
│   ├── dashboard-sprints.js
│   ├── dashboard-reports.js
│   ├── dashboard-settings.js
│   ├── dashboard-activity.js
│   ├── dashboard-modals.js
│   ├── dashboard-init.js
│   ├── mentions.js
│   ├── attachments.js
│   ├── recurring-tasks.js
│   ├── templates.js
│   ├── test-data-generator.js
│   ├── lang.js
│   ├── lang/en.js
│   └── lang/ar.js
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-180.png
│   ├── icon-192.png
│   └── icon-512.png
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    ├── CHANGELOG.md
    └── CONTRIBUTING.md
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `auth/unauthorized-domain` | Add domain to Firebase Authorized Domains |
| `permission-denied` | Deploy Firestore security rules |
| PWA not installing | HTTPS required (Vercel/Netlify provide this) |
| Emails not sending | Check EmailJS Public Key and template IDs |
| Charts not rendering | Verify Chart.js CDN is loading |
| Arabic text not displaying | Check `lang/ar.js` is loaded |
| Milestones not saving | Verify Firestore write permissions |
| "columns[status].tasks is undefined" | Update to latest `dashboard-tasks.js` |

### Clear Cache

After deployment, users may need to hard refresh:
- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

---

## Support

- **GitHub Issues:** [Create Issue](https://github.com/osmanfist/oriental/issues)
- **Documentation:** See `docs/` folder

---

## License

MIT License - See [LICENSE](../LICENSE)
```

---

Both files are now updated with the complete v2.3.0 architecture, 5-column board, milestone system, role hierarchy, modular JavaScript structure, and all 15 CSS files.