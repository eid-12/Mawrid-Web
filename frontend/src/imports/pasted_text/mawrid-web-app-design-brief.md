DESIGN BRIEF (FIGMA AI PROMPT) — “Mawrid” Web App UI

Goal:
Design a modern, clean, responsive web application UI called “Mawrid” for university equipment lending/borrowing and lab resource management. The app supports three roles:
1) General User (Student/Faculty) — can browse equipment in their college, request borrowing, track requests, and manage their profile (CAN change phone number and password; CANNOT change university email).
2) College Admin — manages inventory and approves/rejects requests for their college.
3) Super Admin — global system oversight (aggregated dashboards, colleges management, user management). AI prioritization is shown as a future/expansion feature.

Style:
- Light theme, minimal and professional, soft rounded corners (16–20px), subtle shadows, lots of whitespace.
- Primary brand is a pill gradient button style (Sky → Indigo), similar to the reference:
  Gradient: #8CCDE6 → #87ABE7 → #8393DE
- Use friendly, modern typography (Inter or similar).
- Use simple line icons (Lucide/Feather style).

Core Pages (Create Desktop frames 1440px + Tablet 834px + Mobile 390px):
PUBLIC (3 pages)
1) Landing
   - Hero section: Mawrid headline + short description
   - CTA buttons: “Join now” (primary gradient) and “Log in”
   - 3–4 feature cards: Data Isolation, Email Verification, Auto Status Update, No Double Booking
2) Login
   - Email (university email) + Password
   - Links: “Forgot password?” and “Create account”
   - If account not verified: show warning banner + “Resend verification link”
3) Verification
   - Verification success state + error state
   - “Resend verification link” button
   - “Go to Login”

GENERAL USER PORTAL (4 pages)
4) User Dashboard
   - Summary cards: Active borrows, Pending requests, Approved requests, Due soon
   - Notifications panel (e.g., approval/return reminders)
   - Quick actions: “Browse catalog”, “My requests”
   - Header shows user name + College name (multi-tenant clarity)
5) Catalog
   - Search bar + filters (Category, Availability, Condition)
   - Grid cards for items: image placeholder, name, category, status badge
6) Item Details
   - Item info, specifications, availability timeline (simple), and “Request borrow” button
   - “Similar items” section (optional)
7) My Requests
   - Table/list with status badges: Pending / Approved / Rejected / Delivered / Returned
   - Request detail drawer/modal with reason for rejection (if any)
   - Allow cancel request only while Pending (optional)

GENERAL USER ACCOUNT SETTINGS (embedded inside User Dashboard or separate page)
- Profile & Security Settings section:
  - University Email (READ-ONLY / disabled field, cannot be edited)
  - Phone Number (editable)
  - Change Password form:
    - Current Password, New Password, Confirm Password
    - Password strength indicator + validation messages
  - Save changes confirmation toast

COLLEGE ADMIN PORTAL (4 pages)
8) Admin Dashboard (college statistics)
9) Inventory (CRUD equipment)
10) Requests (approve/reject with reason)
11) Checking (fast check-in/out: confirm delivery/return; updates item status)

SUPER ADMIN PORTAL (3+ pages)
12) Global Dashboard (aggregated analytics across colleges; no private user-level detail)
13) Colleges (manage tenants/colleges)
14) User Management (manage accounts and college admins)
15) AI Expansion Phase (optional page/section)
   - Show it as “Coming soon / Phase 2”
   - Simple explanation card: AI Priority Sorting based on deadlines, resource scarcity, academic needs, fairness.

UX & Interaction Requirements:
- Clear form validation, inline error messages, success toasts.
- Consistent status badges and color semantics (success/warn/error).
- Prevent double-booking cues: show “Unavailable” states clearly and disable request button.
- Accessibility: visible focus states, sufficient contrast, large tap targets, keyboard-friendly forms.

COMPONENTS (Create reusable components):
- App Shell: top bar + left sidebar navigation (role-based menus)
- Gradient Primary Button (pill) + Secondary button
- Inputs: text, password with show/hide icon, disabled input style
- Cards, badges, modal, table/list row, filter chips, pagination, empty states, loading skeletons

BRAND COLORS (use these exact values)
Primary Gradient Stops:
- Gradient Start (Sky): #8CCDE6
- Gradient Mid: #87ABE7
- Gradient End (Indigo): #8393DE
Text on Primary: #FFFFFF

Suggested Background:
- App background: #F5F9FF
- Card background: #FFFFFF
- Borders: #E2E8F0
Text:
- Heading: #0F172A
- Body: #334155
Muted text: #64748B

COLOR SCALES (tokens)
Brand Sky Scale:
50  #F9FCFE
100 #F1F9FC
200 #E2F2F9
300 #D1EBF5
400 #BAE1F0
500 #8CCDE6
600 #77AEC4
700 #6290A1
800 #4D717F
900 #38525C

Brand Indigo Scale:
50  #F9FAFD
100 #F0F2FB
200 #E0E4F7
300 #CDD4F2
400 #B5BEEB
500 #8393DE
600 #6F7DBD
700 #5C679B
800 #48517A
900 #343B59

Neutral Scale:
50  #F7F8F9
100 #ECEEF1
200 #D8DCE2
300 #C1C7D1
400 #A2ACB9
500 #64748B
600 #556376
700 #465161
800 #37404C
900 #282E38

BUTTON SPEC (match reference)
- Pill radius: 999px, height ~44px (desktop), 40px (mobile)
- Left icon circle: 28px, border rgba(255,255,255,0.55)
- Subtle shadow: rgba(131,147,222,0.25) 0 10px 20px
- Hover: slightly darker gradient; Active: darker again

Deliverables:
- Figma file with: Design System page (colors, type, components), then each page frame set (Desktop/Tablet/Mobile), with reusable components and variants.