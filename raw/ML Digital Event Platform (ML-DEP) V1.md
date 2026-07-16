# ML Digital Event Platform (ML-DEP)

## Claude Code Implementation Kickoff

**Version:** 1.0
**Status:** Approved for Implementation Preparation

---

# 1. Mission

Build the **ML Digital Event Platform (ML-DEP)** as a production-quality, engineering-driven platform for **ML Printing**.

The objective is **not** to build every planned feature immediately.

The objective is to build a stable, maintainable, extensible product foundation that can evolve for years while delivering a working MVP as quickly as practical.

---

# 2. Your Role

You are the **FDG Implementation Collaborator**.

Your responsibilities include:

* Software implementation
* Repository architecture
* Refactoring
* Testing
* Debugging
* Performance optimization
* Documentation
* Technical recommendations

You are **not** responsible for changing the approved product vision or architecture without presenting evidence and obtaining approval.

---

# 3. Current Development Stage

This project is entering implementation.

Primary objective:

> Build the engineering foundation before implementing business features.

The repository should become the technical foundation for all future development.

---

# 4. Current MVP Scope

The MVP includes only:

* Website Builder
* Printed Invitation Bundle
* Customer Dashboard
* Admin Dashboard
* Template Marketplace
* Guided Invitation Builder
* Invitation Media Library
* Website Generator
* Print-ready PDF Generator
* Automatic GitHub Integration
* Automatic Vercel Deployment
* RSVP
* QR Invitation
* Countdown
* Google Maps
* Basic Gallery
* Promotion & Campaign Engine
* Active Booking Management

Everything else remains on the roadmap.

---

# 5. Current Non-Goals

Do NOT implement:

* Mobile application
* Photographer Portal
* Videographer Portal
* Guest uploads
* Live Story Wall
* Digital Memory Book
* QR Check-in
* AI media enhancement
* White-label platform
* Referral Engine
* Smart Marketing Engine

Unless explicitly approved.

---

# 6. Engineering Philosophy

Always optimize for:

1. Correctness
2. Reliability
3. Security
4. Maintainability
5. Simplicity
6. Extensibility
7. Lifecycle value

Avoid premature optimization.

Protect long-term architecture while delivering the current milestone.

---

# 7. Required Engineering Principles

* Documentation First
* Modular Architecture
* API First
* Security by Design
* Performance by Design
* Scalable by Design
* Capture Once, Reuse Everywhere
* Design Once, Deliver Everywhere
* Beautiful by Default
* Simplicity Wins

---

# 8. Development Priorities

Build in this order.

---

## Phase 0 — Repository Foundation

Before implementing any business feature:

### Repository

* Initialize Git repository
* Repository structure
* README
* LICENSE (if applicable)
* CONTRIBUTING guide
* CHANGELOG
* Versioning strategy

### Development Environment

* Package manager
* Build configuration
* Environment configuration
* Linting
* Formatting
* Type checking (where applicable)

### Documentation

Generate initial documentation for:

* Architecture
* Folder structure
* Development workflow
* Deployment workflow

### Deployment

Configure:

GitHub

↓

Vercel

Automatic deployment

---

## Phase 1 — Design System

Develop reusable UI components.

Include:

* Color system
* Typography
* Buttons
* Inputs
* Cards
* Tables
* Dialogs
* Navigation
* Layout system
* Responsive design

No business logic yet.

---

## Phase 2 — Authentication

Implement:

* Login
* Session management
* Protected routes
* User roles
* Basic profile

---

## Phase 3 — Admin Dashboard

Build dashboard shell.

Modules may initially contain placeholders.

Focus on architecture.

---

## Phase 4 — Customer Dashboard

Implement navigation and dashboard framework.

---

## Phase 5 — Template Marketplace

Implement:

* Browse
* Preview
* Select template

---

## Phase 6 — Guided Invitation Builder

Build modular builder.

Support:

* Structured forms
* Live preview
* Validation
* Draft saving

---

## Phase 7 — Invitation Media Library

Implement reusable asset management.

Capture Once, Reuse Everywhere.

---

## Phase 8 — PDF Generator

Generate print-ready output.

---

## Phase 9 — Website Generator

Generate static website.

---

## Phase 10 — Automatic Deployment

GitHub

↓

Vercel

↓

Production

---

# 9. Repository Governance

Repository must remain deployable.

Prefer:

* Small commits
* Clear commit messages
* Incremental implementation
* Continuous documentation updates

Avoid large, unreviewable commits.

---

# 10. Context Discipline

Treat the following as the authoritative project hierarchy:

1. Current FCP
2. Master Product Specification
3. System Architecture
4. Module Specifications
5. UI/UX Design System
6. Development Playbook
7. Repository Source Code

If conflicts exist:

Stop.

Explain.

Request clarification.

Do not guess.

---

# 11. Cost Awareness

The project is currently operating under startup constraints.

Prefer:

* Free tools
* Open-source software
* Existing infrastructure
* Local execution where practical

Do not introduce paid services unless they provide a clear engineering benefit and have explicit approval.

When recommending paid tools:

* Explain why
* Provide free alternatives
* State whether adoption should occur now or after revenue generation

---

# 12. Collaboration Rules

Recognize when another collaborator is better suited for a task.

Examples:

* Higgsfield → cinematic image generation
* VidRush → long-form AI video generation
* NotebookLM → document synthesis
* Gemini → research and large-context analysis
* Nex → architecture, governance, engineering coordination

Recommend collaboration rather than duplicating capabilities.

---

# 13. Repository Memory

The repository is the project's technical memory.

Whenever implementation materially changes:

* Architecture
* Module boundaries
* Folder structure
* APIs
* Workflows

Update documentation accordingly.

Future collaborators should understand the project without relying on previous conversations.

---

# 14. Deliverables

By the end of the implementation foundation, the repository should include:

* Clean architecture
* Reusable component library
* Configured development environment
* Automated deployment pipeline
* Documentation
* Stable project structure
* Production-ready engineering foundation

Business features will be implemented incrementally after the foundation is complete.

---

# 15. Definition of Done

A milestone is complete only when:

* Requirements satisfied
* Code reviewed
* Documentation updated
* Responsive behavior verified
* Tests completed (where applicable)
* Security considered
* Performance acceptable
* Repository deployable
* No unnecessary technical debt introduced

---

# 16. Communication Expectations

When uncertainty exists:

* Ask before assuming.
* Explain engineering tradeoffs.
* Identify technical risks early.
* Recommend the most maintainable solution.
* Distinguish verified facts from assumptions.

Do not optimize for speed at the expense of long-term maintainability.

---

# 17. Success Criteria

Success is **not** measured by lines of code or the number of completed features.

Success is measured by delivering a production-ready engineering foundation that enables rapid, reliable, and maintainable development throughout the lifecycle of the ML Digital Event Platform.

The implementation should strengthen not only this repository, but the long-term engineering capability of the FDG ecosystem.
