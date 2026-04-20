# Contributing to Oriental

First off, thank you for considering contributing to Oriental! It's people like you that make Oriental such a great tool.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots if possible

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
 - Device: [e.g. iPhone 14]
 - OS: [e.g. iOS 16]
 - Browser: [e.g. Chrome 120]
 - Version: [e.g. 2.0.0]

**Additional context**
Add any other context about the problem here.

Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

    Use a clear and descriptive title

    Provide a step-by-step description of the suggested enhancement

    Provide specific examples to demonstrate the steps

    Describe the current behavior and explain which behavior you expected to see instead

    Explain why this enhancement would be useful

Pull Requests

    Fork the repo and create your branch from main

    If you've added code that should be tested, add tests

    If you've changed APIs, update the documentation

    Ensure the test suite passes

    Make sure your code lints

    Issue that pull request!

Development Workflow
bash

# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/oriental.git
cd oriental

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Run locally to test
python3 -m http.server 8000

# Commit your changes
git add .
git commit -m 'Add some amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request

Style Guides
Git Commit Messages

    Use the present tense ("Add feature" not "Added feature")

    Use the imperative mood ("Move cursor to..." not "Moves cursor to...")

    Limit the first line to 72 characters or less

    Reference issues and pull requests liberally after the first line

JavaScript Style Guide

    Use ES6+ features

    Use const for variables that don't change, let for those that do

    Use async/await over .then() chains

    Add descriptive comments for complex functions

    Use meaningful variable names

javascript

// Good
async function loadUserData() {
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data();
}

// Avoid
async function load() {
    const d = await db.collection('users').doc(i).get();
    return d.data();
}

CSS Style Guide

    Use CSS variables for colors and spacing

    Follow BEM naming convention for classes

    Keep selectors simple and flat

css

/* Good */
.task-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
}

/* Avoid */
.task-card .title .text {
    background: white;
}

Testing

Before submitting a PR, please test your changes:

    Functional Testing: Manually test the feature you've changed

    Cross-browser Testing: Test on Chrome, Firefox, Safari

    Mobile Testing: Test on different screen sizes

    Dark Mode Testing: Test both light and dark themes

Documentation

If you're adding or changing functionality, update the documentation:

    Update README.md with new features

    Update API.md if you change Firestore structure

    Add JSDoc comments to new functions

javascript

/**
 * Creates a new task in the current project
 * @param {Object} taskData - The task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description
 * @returns {Promise<boolean>} Success status
 */
async function createTask(taskData) {
    // Implementation
}

Getting Help

    Join our Discord community

    Check existing GitHub Issues

    Read the documentation

Recognition

Contributors will be recognized in the README and on our website.

Thank you for contributing! 🎉

