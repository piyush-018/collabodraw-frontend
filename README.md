# CollaboDraw Studio

![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-blue?style=for-the-badge) 
**[Experience CollaboDraw Live](https://collabodraw-frontend-seven.vercel.app)**

CollaboDraw Studio is a low-latency, real-time multiplayer whiteboard built for frictionless visual brainstorming. It bridges the gap between chaotic multiplayer drawing and highly accessible, power-user-friendly tools.

---

## Hackathon Objective Mapping (100% Completed)

We systematically built and shipped the requirements outlined in the problem statement, aligning with the official evaluation tiers:

* **Level 1 (Core Functionality):** Fully implemented secure User Authentication (via Clerk), Board Management (unique room generation), Real-Time Collaboration (via Socket.io), and core drawing tools (Pen, Shapes, Eraser) with dynamic color and stroke adjustments.
* **Level 2 (Intermediate Features):** Ensured seamless Sharing via shareable board URLs and delivered a strictly Responsive Design optimized for desktop, tablet, and mobile viewing.
* **Level 3 (Advanced Features):** Integrated robust Image Support (configured as anchored reference layers) and one-click Export Options to PNG, JPG, and PDF formats.
* **Bonus Implementations:** Successfully delivered a Real-Time Chat System (Bonus C), Sticky Notes (Bonus A), Laser Pointer (Bonus B), and extensive Keyboard Shortcuts (Bonus E). Additionally, we innovated beyond the rubric with custom Text-to-Speech (accessibility) and instant Emoji Reactions.

---

## Unique Selling Propositions (USPs)

### 1. The "Command Center" vs. "Canvas" UI (Context-Aware Chat)
Our UI respects the device you are using. 
* **On Web/Desktop:** You get the full "Command Center" experience, with a live chat box visible on the side to text while you draw.
* **On Mobile:** We dynamically **hide the chat box** to dedicate 100% of the screen real estate to the drawing canvas. Mobile users need space to draw, not a cramped UI.

### 2. Rapid-Fire Emoji Reactions
Brainstorming requires instant, non-verbal feedback. Users can press `1`, `2`, `3`, or `4` on their keyboard to instantly drop emoji reactions on the board without interrupting the person actively drawing or speaking.

### 3. Text-to-Speech (Accessibility)
To make CollaboDraw inclusive, we integrated Text-to-Speech functionality. Users can have textual notes or elements read aloud to them, breaking down barriers for visually impaired users or those who prefer auditory learning during collaborative sessions.

---

## Power-User Keyboard Shortcuts

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

## Strategic Engineering & UX Decisions

Building a distributed real-time system comes with complex state-management challenges. We made strict design choices to prioritize stability over chaos:

### 1. Why are Images & Sticky Notes "Anchored" (Non-Draggable)?
**The Concept of "Static Reference Layers":** In a highly concurrent environment, if User A drags a background image while User B is drawing on it, the X/Y coordinates conflict, causing severe network jitter. To solve this, uploaded images and sticky notes act as **Anchored Reference Layers**. Once placed, they cannot be moved. This ensures a stable background for everyone to brainstorm over without accidental disruptions.

### 2. Why is Global Undo/Redo Disabled?
**Strict Data Consistency:** Standard array-based history stacks fail in real-time multiplayer apps. If User A hits "Undo", the server might accidentally delete the stroke User B just made (a classic race condition). Implementing CRDTs for this was out of scope. Instead, we enforce strict consistency by relying entirely on the **Eraser Tool**. This exactly mimics a physical whiteboard—you erase mistakes, you don't reverse time.

---

## Tech Stack

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
```
*(Requires a `.env.local` file with Clerk API keys).*

### 2. Backend Setup
```bash
git clone <your-backend-repo-url>
cd collabodraw-backend
npm install
node server.js
```
