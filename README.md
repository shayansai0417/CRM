# 🎓 CR Assignment Tracker — 100% Local Storage Mode
### AIML Batch 1 (60 Students • 5 Subjects)

A fast, mobile-friendly web app built for the **Class Representative (CR)** to track assignment submissions for all **60 students** across **5 subjects**.

**All data is stored and saved locally on your computer** — no cloud account, external server, or database subscription required!

---

## 💾 How Local Storage Works

1. **Local File Database**: All submissions, student names, roll numbers, assignment titles, deadlines, and logs are stored in:
   ```
   data/tracker_state.json
   ```
2. **Instant Auto-Save**: Whenever you tick a checkbox or update a due date, it writes immediately to `data/tracker_state.json` on your PC and mirrors to your browser's local storage.
3. **Local Wi-Fi Sharing**: Run the app on your computer, and anyone on the same Wi-Fi (classmates in the room or hostel) can open the live link on their phones using your computer's IP address (e.g. `http://192.168.1.5:5173`).
4. **Live Realtime Sync**: Uses local Server-Sent Events (SSE). When you tick a box on your laptop or phone, every other connected device updates live without refreshing!
5. **One-Click Backup & Restore**: Download a `.json` backup file anytime via the **Backup** button in the header, or restore previous data using the **Restore** button.

---

## 🌟 Features

### 1. 🌐 Public View (No Login Required)
- **60-Student Table**: Columns for `S.No`, `Student Name`, `Roll Number`, 5 Subjects, and `Submitted (x/5)`.
- **Privacy First**: Student email addresses are completely omitted from all pages.
- **Visual Status**: Green ✅ (`Done`) for submitted, Red ❌ (`Pending`) for incomplete.
- **Search & Filters**: Search by student name or roll number (`261105B303001` to `261105B303060`), filter by pending subjects, or view completed students.
- **Summary Progress Bar**: Top metrics bar showing submitted count, pending count, and percentage progress for each subject.
- **Sticky Table Navigation**: Sticky header (`sticky top-0`) and sticky name column (`sticky left-0`) for smooth phone scrolling.
- **Dark & Light Mode**: Accessible toggle with persistent theme memory.

### 2. 🔐 CR Admin View (Login Protected)
- **CR Login**: Configure the username and password using `VITE_CR_USERNAME` and `VITE_CR_PASSWORD` in your local `.env` file.
- **Password changes**: Update the password from the Change Password option while signed in as CR admin.
- **Lockout**: Five incorrect sign-in attempts lock access for five minutes.
- **Public access**: Visitors can continue as viewers and see the read-only tracker; administrative controls are hidden, while subject-specific reports can be exported from a subject page.
- **Per-subject checking**: Open any subject card for its own searchable, filterable student list, with live submitted/pending counts and subject-specific CSV/PDF reports. CR users can toggle student status by row and use confirmed subject-only bulk actions.
- **Shareable subject routes**: Subject pages use URL hashes, so refresh and browser Back/Forward retain and navigate the selected subject.
- **Instant Checkboxes**: Click or tap any subject cell to tick/untick manually.
- **Subject Focus Mode**: Fast-ticking screen with large, thumb-friendly tap cards to mark 60 students in seconds on your phone.
- **Bulk Buttons**: "Mark all submitted" and "Clear all" buttons with confirmation dialogs.
- **Editable Titles & Due Dates**: Edit the assignment title (e.g. *Assignment 1: Portfolio Webpage*) and deadline (e.g. *Nov 15, 2026*) directly from the interface.
- **Export Reports**:
  - **CSV Export**: Formatted spreadsheet of all 60 students and their status.
  - **Printable PDF**: Clean, print-styled report layout.
- **Activity Log**: Audit log showing recent assignment updates.

---

## 📚 5 Fixed Subjects
1. **Web Development**
2. **English**
3. **Math**
4. **Physics**
5. **C Language**

---

## 🚀 How to Run Locally (Windows + VS Code)

### Step 1: Open Terminal in VS Code
Open the project folder (`CRM`) in VS Code, then open the terminal (`Ctrl + \``).

### Step 2: Configure CR Login
1. Set `VITE_CR_USERNAME` and `VITE_CR_PASSWORD` in `.env`. If `.env` does not exist, copy `.env.example` first.
2. Keep `.env` private; it is excluded from Git. Do not replace an existing `.env` file if it contains other settings.

### Step 3: Start the Local App
Run either of the following commands:
```powershell
npm run dev
```
*or for the production server:*
```powershell
npm start
```

### Step 4: Open in Browser
- **On your PC**: Open [http://localhost:5173](http://localhost:5173)
- **On your Phone (same Wi-Fi)**: Look at the terminal output to find your local IP address (e.g. `http://192.168.1.XX:5173`) and open that URL in your phone browser!

### Step 5: CR Access
The app opens on the login page. Classmates can choose **Continue as Viewer (read-only)**; the CR can sign in to mark submissions, edit assignment titles and due dates, reset submissions, and export reports.

---

## 📂 Project Structure
```
CRM/
├── data/
│   ├── Hall_Ticket_Numbers_3001-3060.xlsx  # Original student list (60 students)
│   └── tracker_state.json                 # Active local database (auto-saved)
├── server/
│   └── localDbPlugin.js                   # Local Vite API & SSE sync server
├── src/
│   ├── components/                        # UI Components (Table, Stats, Focus Mode, etc.)
│   ├── context/TrackerContext.jsx         # Local state & persistence manager
│   ├── data/students_seed.json            # Student data (emails excluded for privacy)
│   ├── App.jsx                            # Main layout
│   └── index.css                          # Tailwind CSS & Print styles
├── server.js                              # Standalone production server
└── package.json
```

---

## 💾 Backup and Reset
- **Backup**: Click the **Backup** button in the header to download a timestamped copy of `tracker_state.json`.
- **Restore**: Click **Restore** and choose any saved `.json` backup file.
- **Reset to Clean State**: Run `npm run init:db` in your terminal to regenerate a fresh `tracker_state.json` from the original Excel file.
