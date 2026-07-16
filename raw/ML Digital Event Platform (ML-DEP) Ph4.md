# ML Digital Event Platform (ML-DEP)

# Phase 4 — Invitation Media Library

## Objective

Develop a centralized Invitation Media Library that serves as the single source of truth for all customer-uploaded assets.

This module implements the FDG principle:

> **Capture Once, Reuse Everywhere**

Every uploaded asset should be reusable across the Website Generator, Print-ready PDF Generator, previews, future mobile applications, and future AI-assisted features without requiring duplicate uploads.

---

# Deliverables

## 1. Media Library

Create a centralized media management system.

Supported asset types:

* Images
* Logos
* Background Images
* Decorative Graphics
* Audio (future-ready)
* Video (future-ready)
* Documents (future-ready)

The architecture should support additional media types without redesign.

---

## 2. Folder Organization

Automatically organize media by:

* Event
* Customer
* Media Type

Example:

```
Customer
└── Event
    ├── Cover Photos
    ├── Gallery
    ├── Logos
    ├── Backgrounds
    └── Other Assets
```

Manual folder creation should not be required.

---

## 3. Upload Manager

Support:

* Drag-and-drop upload
* Multi-file upload
* Upload progress
* Retry failed uploads
* Cancel upload
* File validation

---

## 4. Supported Formats

Initial support:

Images

* JPG
* JPEG
* PNG
* WEBP

Future-ready:

* SVG
* MP4
* MP3
* PDF

---

## 5. Image Processing

Automatically:

* Generate thumbnails
* Optimize images
* Preserve originals
* Generate responsive versions
* Strip unnecessary metadata where appropriate

Original files must always remain available.

---

## 6. Asset Metadata

Each asset should store:

* Asset ID
* Owner
* Event
* Upload Date
* File Type
* Dimensions
* File Size
* Version
* Usage References

This enables future asset tracking.

---

## 7. Asset Browser

Provide:

* Grid View
* List View
* Search
* Sort
* Filter
* Preview

---

## 8. Search

Support search by:

* Filename
* Tags
* Event
* Upload Date
* Media Type

Architecture should support semantic search in the future.

---

## 9. Asset Reuse

Users can reuse previously uploaded assets.

Avoid duplicate uploads.

Multiple invitation sections may reference the same asset.

---

## 10. Replace Asset

Support replacing an asset while preserving references.

Example:

Replace Cover Photo

↓

Every page using that photo updates automatically.

---

## 11. Delete Protection

Before deleting an asset:

Display where it is currently used.

Prevent accidental deletion of assets still referenced by invitations.

---

## 12. Storage Management

Display:

* Total Storage Used
* Number of Assets
* Event Storage Summary

Future subscription plans can use this information without architectural changes.

---

## 13. Security

Ensure:

* Customer isolation
* Authorization checks
* File validation
* Secure file naming
* Protection against malicious uploads

---

## 14. Performance

Optimize for:

* Lazy loading
* Progressive image loading
* Thumbnail caching
* Efficient storage
* Fast retrieval

---

## 15. API Design

The Media Library should expose reusable services for:

* Website Generator
* PDF Generator
* Preview Engine
* Future Mobile Applications
* Future AI Services

The Media Library should never depend on these consumers.

Instead, other modules depend on the Media Library.

---

# UI Requirements

The Media Library should provide:

* Modern asset browser
* Fast searching
* Large previews
* Simple uploads
* Responsive layout
* Consistent design language

The experience should resemble professional cloud storage rather than a traditional file manager.

---

# Out of Scope

Do NOT implement:

* Website generation
* PDF generation
* AI image enhancement
* AI background removal
* AI editing
* Video editing

These belong to future milestones.

---

# Success Criteria

The customer can:

✓ Upload media

✓ Browse media

✓ Search assets

✓ Organize assets automatically

✓ Reuse assets across the project

✓ Replace assets without breaking references

✓ Continue to Website Generation and Print Generation using the same shared media repository

The Invitation Media Library is complete when every uploaded asset becomes a reusable resource across the entire ML Digital Event Platform, eliminating duplicate uploads and supporting the "Capture Once, Reuse Everywhere" principle.
