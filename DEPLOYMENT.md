# Deployment Guide

This guide covers deploying Oriental to various platforms.

## Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free)
- Firebase project

### Steps

1. **Push code to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main

    Connect to Vercel

        Go to vercel.com

        Sign in with GitHub

        Click "Add New" → "Project"

        Select your oriental repository

        Framework Preset: "Other"

        Click "Deploy"

    Configure Firebase for Vercel domain

        Go to Firebase Console → Authentication → Settings

        Add your Vercel domain to Authorized domains

        Example: oriental.vercel.app

    Set up Environment Variables (Optional)

        In Vercel project settings → Environment Variables

        Add your Firebase config values

Deploy to Netlify
bash

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

Deploy to GitHub Pages

    Enable GitHub Pages

        Go to repository Settings → Pages

        Source: "main" branch

        Folder: "/ (root)"

    Update Firebase authorized domains

        Add yourusername.github.io to Firebase authorized domains

Deploy to Firebase Hosting
bash

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Select your project
# Set public directory: ./
# Configure as single-page app: No

# Deploy
firebase deploy --only hosting

Self-Hosting
Option 1: Local Server
bash

# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000

Option 2: Docker
dockerfile

FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80

bash

docker build -t oriental .
docker run -p 80:80 oriental

Post-Deployment Checklist

    Firebase authorized domains updated

    Google Analytics ID configured

    EmailJS service IDs updated

    Dark mode works

    PWA install prompt appears

    Offline mode functional

    Activity log visible

    Email notifications sending

Troubleshooting
404 Errors

    Check file paths (use relative paths)

    Ensure index.html exists

Firebase Connection Issues

    Verify authorized domains

    Check CORS settings

    Validate Firebase config values

PWA Not Installing

    Check HTTPS (required for PWA)

    Verify manifest.json is accessible

    Check service worker registration

Email Not Sending

    Verify EmailJS service ID

    Check template ID matches

    Ensure public key is correct

Environment Variables
Variable	Description
VITE_FIREBASE_API_KEY	Firebase API key
VITE_FIREBASE_AUTH_DOMAIN	Firebase auth domain
VITE_FIREBASE_PROJECT_ID	Firebase project ID
VITE_GA_MEASUREMENT_ID	Google Analytics ID
EMAILJS_PUBLIC_KEY	EmailJS public key
Monitoring

    Google Analytics: Track user behavior

    Firebase Console: Monitor database usage

    Vercel Analytics: Performance metrics