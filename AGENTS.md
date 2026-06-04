Here is a comprehensive Product Requirement Document (PRD) optimized for consumption by an AI coding agent (like Claude Engineer, Cursor, or an LLM developer prompt).

It explicitly lays out the architecture, behavior, and data schemas while emphasizing the keyboard-first, low-friction UX required to clone the Lotus Agenda magic.

---

# Product Requirement Document (PRD)

## Project Name: Project Agenda (AI-Powered PIM)

### 1. Product Overview & Core Vision

Project Agenda is a modern web reincarnation of the classic 1980s personal information manager (PIM) Lotus Agenda. The core ethos is **Zero Friction Data Dump + Intelligent Automated Structuring**.

* **The Problem:** Modern task/knowledge managers require users to fiddle with multi-select dropdowns, calendars, and folders, breaking user focus.
* **The Solution:** A unified keyboard-driven environment where raw thoughts are dumped onto a single line, and a background AI agent cleanly decomposes, extracts, categorizes, and projects those notes instantly across an elegant, high-density dashboard matrix.

### 2. Technology Stack & Architecture

* **Frontend:** React (Next.js) or SvelteKit, styled using **Tailwind CSS**.
* **Backend Hosting:** **Google Cloud Run** (for stateless API handling and AI pipeline isolation).
* **Database:** **Cloud Firestore** (NoSQL for semi-structured item storage).
* **AI Orchestration:** **Firebase AI Logic** or **Firebase Genkit** communicating directly with the `gemini-3.5-flash` model for structured JSON parsing.
* **Authentication:** **Firebase Authentication** (Google Sign-In & Email/Password).

---

### 3. Core Features & User Stories

#### A. The Global Command Bar & Raw Input

* **User Story:** As a user, I want to type an arbitrary thought into a single input field, hit `Enter`, and have it instantly handled without touching my mouse or filling out forms.
* **Behavior:**
* Clean, prominent text entry bar at the top of the interface.
* Hitting `Enter` clears the input instantly and streams the item locally to an "Unassigned Box" while firing a background cloud function invocation to the AI parser.



#### B. The Structured AI Extraction Engine

* **User Story:** As a developer/user, I want the system to cleanly extract attributes from raw unstructured strings without manual configuration.
* **Engine Requirements:** When a raw text string is submitted, the AI pipeline must parse the text and return a strict schema:
```json
{
  "rawText": "Set up a lunch meeting with @Marcus on next Tuesday re: #marketing budget",
  "action_items": ["Set up lunch meeting"],
  "people": ["Marcus"],
  "tags": ["marketing", "budget"],
  "dates": [
    {
      "label": "lunch meeting",
      "iso_date": "2026-06-02T12:00:00Z", 
      "is_relative_inferred": true
    }
  ]
}

```


*(Note: The AI agent must safely evaluate expressions like "next Tuesday" relative to the user's current timestamp).*

#### C. The Matrix Display Grid (Dynamic Views)

* **User Story:** As a user, I want to see my notes automatically filed into discrete columns depending on what criteria I choose to view.
* **UI Structure:**
* A 3-column or 4-column multi-grid panel.
* Three persistent macro view settings toggleable via hotkeys:
1. **Project View:** Items split into columns derived from `#tags`.
2. **People View:** Items split into columns derived from `@people`.
3. **Timeline View:** Items split into columns matching `Today`, `Tomorrow`, `This Week`, and `Someday`.





#### D. The Keyboard-First Interaction System

* **User Story:** As a power user, I want to navigate the entire app using the keyboard alone.
* **Required Hotkeys:**
* `Ctrl + K` or `Cmd + K`: Opens global command palette to quickly switch views or execute actions.
* `Arrow Keys / Tab`: Move system focus outline between matrix grid blocks and list entities.
* `E`: Open inline modal text area to modify an active node.
* `D`: Archive/Mark selected item as complete.
* `/`: Jump directly to the Global Command input bar.



---

### 4. Database Schema (Firestore Collections)

```typescript
// /users/{userId}
interface User {
  uid: string;
  email: string;
  createdAt: Timestamp;
}

// /users/{userId}/items/{itemId}
interface AgendaItem {
  id: string;
  rawText: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // AI Derived Metadata (Soft Tags)
  aiParsed: {
    processedAt: Timestamp;
    actionItems: string[];
    people: string[];
    tags: string[];
    inferredDates: {
      label: string;
      dateStr: string; // ISO format
    }[];
  };

  // User manual overrides (Hard Anchors)
  userOverrides: {
    people?: string[];
    tags?: string[];
    dates?: string[];
  };
}

```

---

### 5. Non-Functional Requirements & Design Language

* **Design Aesthetic:** High-contrast Dark Mode. Monospace typography fallback layout utilizing `font-mono` system styles. Zero heavy transitional animations. Aim for ultra-low rendering latencies to mimic an operating system CLI or a retro terminal.
* **Soft vs. Hard Values:** Visual display indicators must explicitly show if a tag was determined dynamically by the AI framework vs manually hard-pinned by the developer. (e.g., AI tags render with a fine dashed border; User overrides render solid green/amber).
* **Optimistic UI Updates:** When an item is modified, deleted, or introduced locally, render it in the viewport state instantly while Firestore operations resolve asynchronously in the background.

---

### Instructions for the Coding Agent:

> "Implement this layout as a responsive Single Page Application. Start by setting up the localized configuration folder paths, initializing Firebase standard app connectivity wrappers, and laying out the tailwind UI grid. Prioritize the keyboard hook event listeners to guarantee fluid interface tracking before mapping out the Firebase Genkit API pipelines."
