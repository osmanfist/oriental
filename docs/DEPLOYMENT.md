# Deployment Guide

> Version: 2.1.0 | Last Updated: 2024-04-22

This guide covers deploying Oriental to various platforms, including Phase 1 features configuration.

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
- [Environment Variables](#environment-variables)
- [Phase 1 Features Configuration](#phase-1-features-configuration)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Analytics](#monitoring--analytics)

---

## Prerequisites

- [GitHub](https://github.com) account
- [Firebase](https://firebase.google.com) account (Spark free tier works)
- [EmailJS](https://www.emailjs.com) account (free tier: 200 emails/month)
- Code editor (VS Code recommended)
- Modern web browser

### Optional (for paid features)
- Vercel/Netlify account for deployment
- Custom domain
- Firebase Blaze plan (for Storage, Cloud Functions)

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name: `Oriental`
4. Enable Google Analytics (optional but recommended)
5. Click **"Create Project"**

### 2. Enable Services

**Authentication:**
1. Navigate to **Build → Authentication → Get Started**
2. **Sign-in methods** tab:
   - Enable **Email/Password**
   - Enable **Google**
3. **Authorized domains** tab:
   - Add your deployment domains (Vercel, Netlify, etc.)
   - Add `localhost` for development

**Firestore Database:**
1. Navigate to **Build → Firestore Database → Create Database**
2. Choose **"Start in production mode"**
3. Select a location closest to your users
4. Click **"Enable"**

**Storage (Optional - Phase 1 uses Base64):**
1. Navigate to **Build → Storage → Get Started**
2. Start in production mode
3. Choose location

### 3. Register Web App

1. Project Overview → **Add app** → **Web (</>)**
2. Register app nickname: `Oriental Web`
3. Copy the `firebaseConfig` object:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};
```

4. Paste this into `js/firebase-config.js`

### 4. Deploy Security Rules

**Firestore Rules:**
1. Navigate to **Firestore Database → Rules**
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users - can read all, write own
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Organizations - members only
    match /organizations/{orgId} {
      allow read, write: if isAuthenticated() && 
        request.auth.uid in resource.data.members;
    }
    
    // Projects, Tasks, Comments, Attachments, Templates
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

3. Click **"Publish"**

---

## EmailJS Setup

### 1. Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for free account (200 emails/month)
3. Verify your email

### 2. Add Email Service

1. **Email Services → Add New Service**
2. Choose your email provider (Gmail, Outlook, etc.)
3. Connect your email account
4. Note the **Service ID** (e.g., `service_oriental_0126`)

### 3. Create Email Templates

Create these templates in **Email Templates**:

**Template 1: `oriental_invite`**
```
Subject: {{inviter_name}} invited you to join {{organization_name}} on Oriental

Hello,

{{inviter_name}} has invited you to join {{organization_name}} as a {{role}}.

Click the link below to accept:
{{invite_link}}

This invitation expires in {{expires_in}}.

--
Oriental - Open Source Task Management
```

**Template 2: `task_assigned`**
```
Subject: New Task Assigned: {{task_title}}

Hello {{to_name}},

{{assigner_name}} has assigned you a new task:

📋 {{task_title}}
🔗 {{task_link}}

--
Oriental
```

**Template 3: `comment_on_task`**
```
Subject: New Comment on: {{task_title}}

Hello {{to_name}},

{{comment_author}} commented on task "{{task_title}}":

🔗 {{task_link}}

--
Oriental
```

**Template 4: `mention_notification`** (Phase 1)
```
Subject: {{mentioner_name}} mentioned you in a comment

Hello {{to_name}},

{{mentioner_name}} mentioned you in a comment on task "{{task_title}}".

🔗 {{task_link}}

--
Oriental
```

### 4. Get Credentials

1. **Account → API Keys**
2. Copy your **Public Key**
3. Update in `js/dashboard.js`:

```javascript
emailjs.init('YOUR_PUBLIC_KEY');
```

And update template/service IDs:

```javascript
await emailjs.send('YOUR_SERVICE_ID', 'oriental_invite', templateParams);
```

---

## Deployment Options

### Vercel (Recommended)

**Why Vercel?**
- Free hosting with SSL
- Automatic deployments from Git
- Great performance
- Easy custom domains

**Steps:**

1. Push code to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click **"Add New" → "Project"**
5. Select your `oriental` repository
6. Configure:
   - **Framework Preset:** Other
   - **Build Command:** (leave blank)
   - **Output Directory:** (leave blank)
   - **Install Command:** (leave blank)
7. Click **"Deploy"**

8. Get your deployment URL (e.g., `oriental.vercel.app`)

9. Add to Firebase authorized domains:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add `oriental.vercel.app`

**Custom Domain (Optional):**
1. Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

---

### Netlify

**Steps:**

1. Push code to GitHub

2. Go to [netlify.com](https://netlify.com)
3. Click **"Import from Git"**
4. Select your repository
5. Configure:
   - **Build command:** (leave blank)
   - **Publish directory:** `.`
6. Click **"Deploy site"**

7. Add Netlify URL to Firebase authorized domains

**CLI Alternative:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

### GitHub Pages

**Steps:**

1. Push code to GitHub

2. Go to repository **Settings → Pages**
3. Configure:
   - **Source:** Deploy from branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **"Save"**

5. Your site will be at `https://yourusername.github.io/oriental`

6. Add to Firebase authorized domains:
   - `yourusername.github.io`

**Note:** GitHub Pages doesn't support SPAs without extra configuration. Oriental works as static HTML.

---

### Firebase Hosting

**Steps:**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Select options:
# - Use existing project
# - Public directory: .
# - Configure as single-page app: No
# - Set up automatic builds: No

# Deploy
firebase deploy --only hosting
```

Your site will be at `https://your-project-id.web.app`

---

### Self-Hosting

#### Option 1: Local Server

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000

# VS Code Live Server
# Right-click dashboard.html → Open with Live Server
```

#### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

Build and run:

```bash
docker build -t oriental .
docker run -p 80:80 oriental
```

#### Option 3: Apache/Nginx

Copy all files to your web server directory:
- Apache: `/var/www/html/`
- Nginx: `/usr/share/nginx/html/`

---

## Post-Deployment Checklist

### Core Functionality
- [ ] Firebase config is correct (check console for errors)
- [ ] Can sign up with email/password
- [ ] Can sign in with Google
- [ ] Organization creation works
- [ ] Can create projects
- [ ] Can create/edit/delete tasks
- [ ] Drag and drop between columns works
- [ ] Real-time updates sync across tabs

### Phase 1 Features
- [ ] **@Mentions:** Type `@` in comments, dropdown appears
- [ ] **Attachments:** Upload files (test with small image)
- [ ] **Recurring Tasks:** "Recurring Task" checkbox in task form
- [ ] **Templates:** Click "Templates" button, modal opens
- [ ] **Settings:** Settings page loads with all tabs

### UI/UX
- [ ] Dark mode toggles correctly
- [ ] Mobile responsive (test with DevTools device emulation)
- [ ] Sidebar collapses on mobile
- [ ] Bottom navigation works on mobile
- [ ] Activity log opens and shows actions
- [ ] Keyboard shortcuts work (`?` to show help)
- [ ] Pull to refresh works on mobile

### PWA
- [ ] Service worker registers (check console)
- [ ] Manifest loads (check Application tab)
- [ ] Install prompt appears (may need to trigger manually)
- [ ] Offline mode shows cached content

### Email
- [ ] Invitation emails send
- [ ] Task assignment notifications send
- [ ] Comment mention notifications send (Phase 1)

### Analytics
- [ ] Google Analytics events appear in real-time reports
- [ ] Replace `G-XXXXXXXXXX` with actual GA4 ID

---

## Environment Variables

Oriental currently uses hardcoded configuration for simplicity. For production, consider moving sensitive values to environment variables:

Create `.env` file (never commit):

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
GA_MEASUREMENT_ID=G-XXXXXXXXXX
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_SERVICE_ID=your_service_id
```

Then modify `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "fallback_key",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "fallback_domain",
    // ...
};
```

**Note:** This requires a build step (Webpack, Vite, etc.) to inject environment variables.

---

## Phase 1 Features Configuration

### Attachments (Base64 Storage)

No additional configuration needed. Files are stored in Firestore `attachments` collection.

**Limits:**
- Max file size: 1MB (Firestore document limit)
- Supported types: Images, PDFs, Text, CSV

### Recurring Tasks

Client-side generation - no Cloud Function required.

To enable automatic generation on dashboard load:

```javascript
// In dashboard.js DOMContentLoaded
if (window.recurringManager) {
    window.recurringManager.checkAndGenerateRecurringTasks();
}
```

### Mentions System

Team members are loaded from Firestore `users` collection where `organizations` array contains current org ID.

### Templates Library

Built-in templates are defined in `js/templates.js`. Custom templates are stored in `custom_templates` collection.

---

## Troubleshooting

### 404 Errors

| Issue | Solution |
|-------|----------|
| Missing file | Check file paths (use relative paths) |
| index.html not found | Ensure file is in root directory |
| CSS not loading | Check `css/styles.css` exists |

### Firebase Connection Issues

| Error | Solution |
|-------|----------|
| `auth/unauthorized-domain` | Add domain to Firebase authorized domains |
| `permission-denied` | Deploy Firestore security rules |
| `unavailable` | Check internet connection |

### PWA Not Installing

| Issue | Solution |
|-------|----------|
| HTTPS required | Deploy to Vercel/Netlify (provides HTTPS) |
| Manifest not found | Check `manifest.json` in root directory |
| Service worker error | Check console for registration errors |

### Email Not Sending

| Issue | Solution |
|-------|----------|
| Invalid Public Key | Check EmailJS Account → API Keys |
| Template not found | Verify template ID matches |
| Service ID wrong | Check Email Services → Service ID |

### Phase 1 Features Not Working

| Issue | Solution |
|-------|----------|
| Mentions dropdown not appearing | Check `mentions.js` is loaded |
| Attachments section missing | Check `attachments.js` is loaded |
| Templates button not working | Check `templates.js` is loaded |
| Recurring checkbox missing | Check `recurring-tasks.js` is loaded |

**Quick diagnostic:**
```javascript
// Run in console
console.log('Mentions:', !!window.mentionsSystem);
console.log('Attachments:', !!window.AttachmentsManager);
console.log('Recurring:', !!window.RecurringTasksManager);
console.log('Templates:', !!window.TemplatesLibrary);
```

All should return `true`.

### Phase 1 Features Troubleshooting

| Issue | Solution |
|-------|----------|
| Mentions dropdown not appearing | Check `mentions.js` is loaded. Run `console.log(!!window.mentionsSystem)` |
| Attachments section missing | Check `attachments.js` is loaded. Open task detail and look for `#attachments-container` |
| Recurring checkbox missing | Check `recurring-tasks.js` is loaded. Run `console.log(!!window.recurringManager)` |
| Templates button not working | Check `templates.js` is loaded. Run `console.log(!!window.TemplatesLibrary)` |
| "Child to insert before" error | Fixed in v2.1.1. Update `recurring-tasks.js` and `dashboard.js` |

### Quick Diagnostic
```javascript
// Run in browser console
console.log('Mentions:', !!window.mentionsSystem);
console.log('Attachments:', !!window.AttachmentsManager);
console.log('Recurring:', !!window.recurringManager);
console.log('Templates:', !!window.TemplatesLibrary);
// All should return true




### Clear Cache

After deployment, users may need to clear cache:
- **Windows:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

---

## Monitoring & Analytics

### Google Analytics

1. Create GA4 property at [analytics.google.com](https://analytics.google.com)
2. Copy Measurement ID (format: `G-XXXXXXXXXX`)
3. Replace in `dashboard.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-ID"></script>
<script>
    gtag('config', 'G-YOUR-ID');
</script>
```

### Firebase Console

Monitor usage at [console.firebase.google.com](https://console.firebase.google.com):
- **Firestore:** Reads/writes/deletes
- **Authentication:** Monthly active users
- **Hosting:** Bandwidth usage

### Vercel Analytics

Enable in Vercel project settings for performance metrics.

---

## Rollback Procedure

### Vercel

```bash
# Via CLI
vercel rollback

# Via Dashboard
# Project → Deployments → Select previous → "Promote to Production"
```

### Netlify

Site Settings → Deploys → Select previous deploy → **"Publish deploy"**

### Manual

```bash
git checkout <previous-commit-hash>
git push origin main --force
```

---

## Support

- **GitHub Issues:** [Create Issue](https://github.com/yourusername/oriental/issues)
- **Email:** support@oriental.app
- **Documentation:** See `docs/` folder

---

## License

MIT License - See [LICENSE](../LICENSE)
