# ML Digital Event Platform (ML-DEP)

# Phase 3 — Guided Invitation Builder

## Objective

Develop the Guided Invitation Builder, the core feature of ML-DEP.

Customers should be able to create a complete event invitation through a structured, guided workflow without requiring design experience.

The builder must separate content from presentation, allowing the same event data to generate both the website and the printed invitation.

---

# Deliverables

## 1. Builder Workflow

Implement a step-by-step guided process.

Suggested workflow:

1. Select Template
2. Event Information
3. Couple / Celebrants
4. Schedule & Venue
5. Invitation Content
6. Media
7. Theme & Personalization
8. Preview
9. Save Draft
10. Continue to Order

The workflow should support future steps without redesign.

---

## 2. Event Information

Capture:

* Event Type
* Event Title
* Subtitle
* Event Date
* Event Time
* Time Zone
* RSVP Deadline
* Dress Code
* Theme
* Language

---

## 3. Host Information

Support configurable host types.

Examples:

* Bride & Groom
* Birthday Celebrant
* Debutant
* Family
* Company
* Organization

Capture:

* Display Name
* Optional Photo
* Short Biography (optional)

---

## 4. Venue Information

Capture:

* Venue Name
* Complete Address
* Google Maps Link
* GPS Coordinates (future-ready)
* Reception Venue
* Ceremony Venue
* Parking Notes
* Contact Information

---

## 5. Invitation Content

Structured fields:

* Welcome Message
* Invitation Message
* Parents
* Sponsors
* Program
* Gifts Preference
* Special Notes
* Closing Message

No free-form HTML editing.

---

## 6. Personalization

Allow users to customize:

* Color Theme
* Typography
* Background Style
* Decorative Elements
* Section Visibility

Customization must remain within the approved design system.

---

## 7. Media Integration

Connect to the Invitation Media Library.

Support:

* Cover Image
* Couple Photos
* Family Photos
* Logo
* Background Music (future-ready)

Do not duplicate uploaded assets.

Follow:

**Capture Once, Reuse Everywhere**

---

## 8. Auto Save

Implement:

* Automatic Save
* Manual Save
* Draft Recovery

Users should never lose work due to accidental refresh or browser closure.

---

## 9. Validation

Validate:

* Required Fields
* Date Consistency
* Time Format
* Image Requirements
* Character Limits

Provide clear, user-friendly error messages.

---

## 10. Live Preview

Provide a real-time preview.

Support:

* Desktop Preview
* Mobile Preview
* Print Preview (basic)

The preview should update immediately as changes are made.

---

## 11. Draft Management

Allow users to:

* Create Draft
* Rename Draft
* Resume Draft
* Delete Draft

---

## 12. Data Model

Store invitation data separately from template layout.

The same structured data must support:

* Website Generator
* Print-ready PDF Generator
* Future Mobile App
* Future API integrations

---

# UI Requirements

The builder must be:

* Guided
* Simple
* Fast
* Responsive
* Accessible
* Professional

Users should feel they are completing a guided interview rather than using complex design software.

---

# Out of Scope

Do NOT implement:

* PDF generation
* Website generation
* Payment
* Booking workflow
* Production workflow

These belong to later phases.

---

# Success Criteria

The customer can:

✓ Complete all invitation information

✓ Upload media

✓ Personalize the invitation

✓ Save drafts

✓ Resume later

✓ View a live preview

✓ Finish the invitation and proceed to the next stage

The Guided Invitation Builder is considered complete when a fully structured invitation dataset can be produced independently of its final website or print output.
