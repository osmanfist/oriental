# Phase 1 Features Guide

> Version: 2.1.1 | Last Updated: 2024-04-28

## Overview

Phase 1 adds four major features to Oriental, all running on Firebase's free Spark plan.

## @Mentions System

### How to Use
1. Open any task detail modal
2. Type `@` in the comment box
3. A dropdown appears with team members
4. Use arrow keys to navigate, Enter to select
5. Mentioned users receive email notifications
6. Mentions appear highlighted in comments

### Technical Details
- File: `js/mentions.js`
- Class: `MentionsSystem`
- Global instance: `window.mentionsSystem`
- Uses team members from Firestore `users` collection

## File Attachments

### How to Use
1. Open any task detail modal
2. Scroll to Attachments section
3. Click "Add Attachment" or drag files
4. Supported: Images, PDFs, Text files
5. Maximum size: 1MB (Base64 stored in Firestore)

### Technical Details
- File: `js/attachments.js`
- Class: `AttachmentsManager`
- Storage: Firestore `attachments` collection
- Free tier: No Firebase Storage required

## Recurring Tasks

### How to Use
1. Click "New Task"
2. Check "🔄 Recurring Task"
3. Select frequency (Daily/Weekly/Monthly)
4. Set interval (every X days/weeks/months)
5. Create task - a recurring badge appears

### Technical Details
- File: `js/recurring-tasks.js`
- Class: `RecurringTasksManager`
- Global instance: `window.recurringManager`
- Storage: Firestore `recurring_templates` collection
- Generation: Client-side on dashboard load

## Templates Library

### How to Use
1. Click "Templates" button in header
2. Browse Project or Task templates
3. Click "Preview" to see details
4. Click "Use Template" to create

### Built-in Templates
- Agile Software Development
- Marketing Campaign
- Product Launch
- Design Sprint
- Hiring Process
- Bug Report
- Feature Request
- Meeting Notes
- Weekly Report

### Technical Details
- File: `js/templates.js`
- Class: `TemplatesLibrary`
- Access: `window.openTemplatesLibrary()`