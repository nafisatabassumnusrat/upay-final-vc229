<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&section=header&reversal=false&text=TenderPack&textBg=false&fontSize=70&fontAlign=50&fontAlignY=50&rotate=0&strokeWidth=0&descSize=20&descAlign=50&descAlignY=60" width="100%" />

</div>
### Smart Tender Package Builder

> A frontend-only document workflow for validating, organizing, and generating submission-ready tender PDF packages.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite\&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Frontend Only](https://img.shields.io/badge/Architecture-Frontend--Only-2563EB)](#architecture)

**TenderPack** is a browser-based tender document preparation workspace designed to help office staff turn a collection of PDF files into a validated, correctly ordered, submission-ready package.

It focuses on the part that usually causes the most manual errors: **knowing what is required, matching the right file, validating expiry dates, catching duplicates, and generating the final package only when blocking issues are resolved.**

---

## Live Demo

**Live Website:** `PASTE_YOUR_LIVE_URL_HERE`

**GitHub:** `PASTE_YOUR_GITHUB_URL_HERE`

---

## Why TenderPack?

Preparing a tender package manually can involve:

* Checking a requirement list against many files
* Identifying the correct documents
* Verifying mandatory vs. optional requirements
* Checking expiry dates
* Detecting duplicate PDFs
* Maintaining the required document order
* Confirming that nothing is missing before submission
* Combining documents into one final PDF

TenderPack turns these steps into a guided workflow with a clear readiness state.

### Core idea

```text
Requirements
     ↓
Upload PDFs
     ↓
Match Documents
     ↓
Validate
     ↓
Generate Package
```

The interface is intentionally designed for a **non-technical office worker**, rather than as a developer-oriented file manager.

---

## Key Features

### Document Management

* Upload multiple PDF files
* Display filename, file size, and page count
* Remove uploaded files
* Enforce PDF-only input
* Track uploaded files against tender requirements

### Requirement Matching

* Map each uploaded PDF to its corresponding requirement
* Prevent one file from being assigned to multiple requirements
* Allow matching to be changed or removed
* Keep required documents in their defined order

### Validation Engine

* `OK` — document is matched and valid
* `Missing` — mandatory document has no matched file
* `Expiry Date Needed` — matched document requires an expiry date
* `Expired` — expiry is before the submission deadline
* `Not Provided` — optional document is not supplied

Blocking issues prevent package generation.

### Duplicate Detection

TenderPack checks PDF content to identify exact-content duplicates even when filenames are different.

### Package Generation

When validation is clear, TenderPack generates a single combined PDF containing:

1. Professional cover page
2. Documents in required order
3. Original page order within each document
4. Page numbering / footer information

### Bilingual Workflow

The interface supports:

* English
* বাংলা

Document labels can use the tender requirement's English and Bangla titles.

---

## Product Workflow

### 01 — Requirements

Load the tender configuration and review:

* Tender ID
* Tender title
* Procuring entity
* Submission deadline
* Required documents
* Document order
* Mandatory / optional state
* Expiry requirements

### 02 — Upload

Add the tender PDFs through the upload workspace.

Each uploaded file is inspected locally in the browser.

### 03 — Match

Connect every available PDF to its corresponding requirement.

### 04 — Verify

TenderPack continuously recalculates document status as files and expiry dates change.

### 05 — Generate

The final package becomes available only when all blocking issues are resolved.

---

## Architecture

TenderPack is intentionally **frontend-only**.

```text
┌──────────────────────────────────────────────┐
│                 TenderPack UI                │
├──────────────────────────────────────────────┤
│ Requirements │ Upload │ Match │ Verify       │
├──────────────────────────────────────────────┤
│              Validation Engine               │
│  Missing • Expiry • Expired • Duplicate • OK │
├──────────────────────────────────────────────┤
│          Browser PDF Processing               │
│          PDF Parsing / Merging                 │
├──────────────────────────────────────────────┤
│             Browser Storage                   │
│       Local session / persisted state         │
└──────────────────────────────────────────────┘
```

### Technology

| Layer          | Technology                    |
| -------------- | ----------------------------- |
| UI             | React                         |
| Language       | TypeScript                    |
| Build Tool     | Vite                          |
| Styling        | CSS / project styling system  |
| PDF Processing | Browser-side PDF libraries    |
| State          | React state / browser storage |
| Deployment     | Static hosting                |
| Backend        | None                          |

---

## Getting Started

### Prerequisites

* Node.js 18+
* npm
* Modern Chromium-based browser

### Installation

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Quality & Reliability

TenderPack treats document validation as a first-class part of the product.

The generation gate considers:

* Required document availability
* Optional document handling
* Expiry requirements
* Expired documents
* Duplicate files
* Document-to-requirement assignment
* Final document ordering

> **If the package is not ready, the interface should make the reason immediately visible.**

---

## UX Principles

**1. Clarity**
Users should always know what is required.

**2. Visibility**
Every requirement has one clear current status.

**3. Prevention**
The interface should prevent invalid assignments and premature generation.

**4. Feedback**
Validation updates immediately after user actions.

**5. Confidence**
Before download, the user should know that the package has passed the required checks.

---

## Security & Privacy

TenderPack is designed around browser-side processing.

* No participant-controlled backend
* No application database required
* PDF processing happens in the browser
* API keys are not hard-coded into the repository
* Sensitive document content does not need to be uploaded to a participant-controlled server

Users should still avoid uploading confidential documents to environments they do not trust.

---

## AI-Assisted Development

This project was developed using AI-assisted coding workflows as permitted by the competition rules.

AI assistance was used for areas such as:

* UI implementation
* Component scaffolding
* Debugging
* Refactoring
* Documentation
* UX iteration
* Code review support

The final implementation, integration, testing, and deployment decisions remain the responsibility of the participant.

### AI Tools

* Antigravity
* ChatGPT

---

## Competition Scope

TenderPack was designed around a strict frontend-only contest environment.

The implementation prioritizes:

1. Correct document validation
2. Correct package ordering
3. Reliable PDF generation
4. Clear blocking states
5. English / Bangla usability
6. Professional enterprise UX
7. Fast browser-side processing

The product intentionally prioritizes **working core functionality over unnecessary complexity**.

---

## Known Limitations

Optional capabilities may remain outside the core workflow, such as:

* Advanced OCR
* Cloud synchronization
* Multi-user collaboration
* Server-side document storage
* Enterprise authentication
* Advanced AI document classification

These are outside the minimum frontend-only architecture.

---

## Roadmap

### Core

* [x] Tender requirement workflow
* [x] PDF upload workflow
* [x] Requirement matching
* [x] Expiry validation
* [x] Status-driven readiness
* [x] Duplicate detection
* [x] PDF package generation
* [x] Bilingual interface
* [x] Responsive workspace

### Future

* [ ] Advanced document classification
* [ ] OCR-assisted matching
* [ ] Signature / seal placement
* [ ] Exportable validation checklist
* [ ] Advanced package templates
* [ ] Enterprise workflow integrations

---

## License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for details.

---

## Author

**Nafisa Tabassum Nusrat**

Computer & Information Systems
Daffodil International University

**Focus:** Full Stack Web Development · AI · Graphic Design · Video Editing

---

## Acknowledgements

Built as part of the **AI DevFest Vibe-Coding Contest 2026**.

The project focuses on solving a practical organizational document-management problem through a browser-based, bilingual workflow.
