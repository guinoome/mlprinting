# ML Digital Event Platform (ML-DEP)

# Phase 7 — Booking, Order Management & Production Workflow

## Objective

Develop the operational backbone of ML-DEP that manages customer bookings, order lifecycle, print production, website deployment status, and internal workflow.

This phase transforms the platform from a design tool into a complete business operation system for ML Printing.

The system shall provide complete visibility from initial inquiry through final delivery.

---

# Engineering Principles

* Every order has a lifecycle.
* Every status change is traceable.
* One order is the single source of truth.
* Digital and print workflows remain synchronized.
* Automation assists operations but does not replace business decisions.

---

# Deliverables

## 1. Booking Management

Implement booking creation and management.

Each booking shall have:

* Booking ID
* Customer
* Event
* Template
* Package
* Current Status
* Assigned Staff
* Timeline
* Payment Status
* Delivery Status

---

## 2. Order Lifecycle

Implement standardized order statuses.

Example:

```
Inquiry
↓

Quotation

↓

Booking Confirmed

↓

Draft Creation

↓

Customer Review

↓

Revision

↓

Approved

↓

Website Generation

↓

PDF Generation

↓

Print Production

↓

Quality Check

↓

Ready for Release

↓

Completed

↓

Archived
```

Status transitions must be controlled and auditable.

---

## 3. Customer Dashboard

Allow customers to:

* View booking status
* Track progress
* Upload requested files
* Review proofs
* Approve revisions
* View payment status
* Download approved digital assets (when applicable)

---

## 4. Production Dashboard

Internal staff should manage:

* Active Orders
* Production Queue
* Website Generation Status
* Print Queue
* Quality Control
* Delivery Queue

---

## 5. Revision Management

Support controlled revisions.

Track:

* Revision Number
* Requested By
* Date
* Description
* Status

Maintain revision history.

---

## 6. Approval Workflow

Customers should explicitly approve:

* Website Design
* Print Design

Approval should lock the design for production unless reopened.

---

## 7. Task Assignment

Support assignment of work to staff.

Each task should include:

* Assignee
* Due Date
* Priority
* Status
* Notes

---

## 8. Internal Notes

Allow staff to record operational notes that are not visible to customers.

Maintain complete audit history.

---

## 9. Notifications

Notify customers and staff when:

* Booking confirmed
* Proof ready
* Revision requested
* Approval required
* Production completed
* Order ready for release

Notification channels should be extensible.

---

## 10. Production Queue

Manage print production.

Display:

* Waiting
* In Progress
* Quality Check
* Completed

Allow prioritization where appropriate.

---

## 11. Website Status

Track:

* Generated
* Ready for Deployment
* Deployed
* Updated
* Archived

This module monitors status only.

Deployment automation belongs to the next phase.

---

## 12. Order Timeline

Provide a complete chronological history.

Record:

* Status Changes
* User Actions
* Staff Actions
* Customer Actions
* Generation Events
* Approval Events

---

## 13. Search & Filtering

Support search by:

* Customer
* Booking ID
* Event
* Status
* Date
* Assigned Staff

Provide filters for efficient operations.

---

## 14. Reporting Foundation

Prepare operational reports including:

* Active Bookings
* Orders by Status
* Production Workload
* Pending Approvals
* Completed Orders

Detailed business analytics belong to a later phase.

---

## 15. Integration

Integrate with:

* Customer Dashboard
* Admin Dashboard
* Website Generation Engine
* PDF Generation Engine
* Future Payment Module
* Future Deployment Module

Maintain loose coupling between modules.

---

# UI Requirements

The workflow should provide:

* Clear status visualization
* Simple navigation
* Timeline view
* Kanban-style production queue (preferred)
* Responsive interface
* Minimal clicks for common tasks

The interface should help staff manage work efficiently rather than simply display data.

---

# Out of Scope

Do NOT implement:

* Online payment gateway
* Automatic GitHub deployment
* Automatic Vercel deployment
* Shipping integration
* Accounting
* Inventory management

These belong to subsequent phases.

---

# Success Criteria

The platform can:

✓ Create bookings

✓ Track order lifecycle

✓ Assign production tasks

✓ Manage revisions

✓ Record customer approvals

✓ Monitor production progress

✓ Maintain a complete audit trail

✓ Synchronize digital and print workflows

The Booking, Order Management & Production Workflow is complete when ML Printing can manage customer projects from booking through production using a single integrated operational workflow.
