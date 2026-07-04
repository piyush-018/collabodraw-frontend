# 🎨 CollaboDraw Studio

![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-blue?style=for-the-badge) 
**[Experience CollaboDraw Live](https://collabodraw-frontend-seven.vercel.app)**

**CollaboDraw Studio** is a low-latency, real-time multiplayer whiteboard built for frictionless visual brainstorming. It bridges the gap between chaotic multiplayer drawing and highly accessible, power-user-friendly tools.

---

## 🏆 Hackathon Objective Mapping (100% Completed)

We systematically built and shipped every requirement outlined in the problem statement, alongside high-value bonuses:

* **✅ Level 1 (Core Canvas):** Fully implemented freehand drawing, dynamic shapes (Rectangle, Circle, Line), laser pointer, eraser, stroke-width adjustments, and color palettes.
* **✅ Level 2 (Real-Time Multiplayer):** WebSockets powered by Socket.io ensure zero-refresh live synchronization. Features dynamic room generation via unique URLs for private, instant sharing.
* **✅ Level 3 (Advanced Features):** Secure, end-to-end user authentication flow (via Clerk) and one-click canvas exports to **PNG, JPG, and PDF**.
* **🚀 Bonus Implementations:** Custom Text-to-Speech (accessibility), rapid keyboard shortcuts, instant emoji reactions, and a context-aware responsive UI.

---

## 🔥 Unique Selling Propositions (USPs)

### 1. The "Command Center" vs. "Canvas" UI (Context-Aware Chat)
Our UI respects the device you are using. 
* **On Web/Desktop:** You get the full "Command Center" experience, with a live chat box visible on the side to text while you draw.
* **On Mobile:** We dynamically **hide the chat box** to dedicate 100% of the screen real estate to the drawing canvas. Mobile users need space to draw, not a cramped UI.

### 2. Rapid-Fire Emoji Reactions
Brainstorming requires instant, non-verbal feedback. Users can press `1`, `2`, `3`, or `4` on their keyboard to instantly drop emoji reactions on the board without interrupting the person actively drawing or speaking.

### 3. Text-to-Speech (Accessibility)
To make CollaboDraw inclusive, we integrated Text-to-Speech functionality. Users can have textual notes or elements read aloud to them, breaking down barriers for visually impaired users or those who prefer auditory learning during collaborative sessions.

---

## ⌨️ Power-User Keyboard Shortcuts

Never break your creative flow. Switch tools instantly with your keyboard:

**Tools:**
* `P` - Pen / Freehand
* `E` - Eraser
* `L` - Line Tool
* `R` - Rectangle Tool
* `C` - Circle Tool
* `W` - Laser Pointer

**Instant Reactions:**
* `1` to `4` - Drop instant Emoji Reactions onto the canvas.

---

## 🧠 Strategic Engineering & UX Decisions

Building a distributed real-time system comes with complex state-management challenges. We made strict design choices to prioritize stability over chaos:

### 1. Why are Images & Sticky Notes "Anchored" (Non-Draggable)?
**The Concept of "Static Reference Layers":** In a highly concurrent environment, if User A drags a background image while User B is drawing on it, the X/Y coordinates conflict, causing severe network jitter. To solve this, uploaded images and sticky notes act as **Anchored Reference Layers**. Once placed, they cannot be moved. This ensures a stable background for everyone to brainstorm over without accidental disruptions.

### 2. Why is Global Undo/Redo Disabled?
**Strict Data Consistency:** Standard array-based history stacks fail in real-time multiplayer apps. If User A hits "Undo", the server might accidentally delete the stroke User B just made (a classic race condition). Implementing CRDTs for this was out of scope. Instead, we enforce strict consistency by relying entirely on the **Eraser Tool**. This exactly mimics a physical whiteboard—you erase mistakes, you don't reverse time.

---

## 💻 Tech Stack

* **Frontend:** Next.js (React), TypeScript, Tailwind CSS
* **Backend:** Node.js, Express, Socket.io
* **Canvas API:** HTML5 Native Canvas (2D Rendering Context)
* **Auth & Deployment:** Clerk, Vercel (Frontend), Render (Backend)

---

## 🚀 Run Locally

### 1. Frontend Setup
```bash
git clone <your-frontend-repo-url>
cd collabodraw-frontend
npm install
npm run dev

(Requires a .env.local file with Clerk API keys).

### 2. Backend Setup
git clone <your-backend-repo-url>
cd collabodraw-backend
npm install
node server.js
