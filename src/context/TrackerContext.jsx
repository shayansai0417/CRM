import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import initialStudents from '../data/students_seed.json';
import { withoutCrtSubject } from '../../shared/subjectMigration.js';

const TrackerContext = createContext(null);

const STORAGE_KEY_SUBMISSIONS = 'cr_local_submissions_v1';
const STORAGE_KEY_SUBJECTS = 'cr_local_subjects_v1';
const STORAGE_KEY_LOGS = 'cr_local_logs_v1';
const STORAGE_KEY_TOKEN = 'cr_local_admin_session';

function authenticatedFetch(url, options = {}) {
  const token = sessionStorage.getItem(STORAGE_KEY_TOKEN);
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export const DEFAULT_SUBJECTS = [
  { id: 'sub-1', name: 'Web Development', assignment_title: 'Assignment 1: Portfolio Webpage', due_date: 'Nov 15, 2026', order_index: 1 },
  { id: 'sub-2', name: 'English', assignment_title: 'Assignment 1: Technical Report Writing', due_date: 'Nov 18, 2026', order_index: 2 },
  { id: 'sub-3', name: 'Math', assignment_title: 'Assignment 1: Linear Algebra Problem Set', due_date: 'Nov 20, 2026', order_index: 3 },
  { id: 'sub-4', name: 'Physics', assignment_title: 'Assignment 1: Semiconductor Physics', due_date: 'Nov 22, 2026', order_index: 4 },
  { id: 'sub-5', name: 'C Language', assignment_title: 'Assignment 1: Pointers & Dynamic Memory', due_date: 'Nov 25, 2026', order_index: 5 },
];

export const INITIAL_STUDENTS = initialStudents.map((s, idx) => ({
  id: `stu-${idx + 1}`,
  sno: s.sno,
  name: s.name,
  roll_number: s.roll_number,
}));

export function TrackerProvider({ children }) {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [submissions, setSubmissions] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);
  const [hasLocalFileServer, setHasLocalFileServer] = useState(false);

  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text: msg, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // 1. Initial Load: Fetch from local server (data/tracker_state.json) or localStorage
  const loadData = useCallback(async () => {
    setLoading(true);
    let serverOk = false;

    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          serverOk = true;
          setHasLocalFileServer(true);
          const {
            students: serverStudents,
            subjects: rawServerSubjects,
            submissions: rawServerSubs,
            activityLogs: serverLogs,
            lastUpdated: serverTime,
          } = json.data;
          const { subjects: serverSubjects, submissions: serverSubs } = withoutCrtSubject(
            rawServerSubjects || DEFAULT_SUBJECTS,
            rawServerSubs || {}
          );

          if (serverStudents && serverStudents.length > 0) setStudents(serverStudents);
          setSubjects(serverSubjects);
          setSubmissions(serverSubs);
          if (serverLogs) setActivityLogs(serverLogs);
          if (serverTime) setLastUpdated(new Date(serverTime));

          // Also mirror in localStorage as backup
          try {
            localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(serverSubs || {}));
            localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(serverSubjects || DEFAULT_SUBJECTS));
            localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(serverLogs || []));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.log('Local API server not responding, using localStorage mode.');
    }

    if (!serverOk) {
      // Fallback to localStorage
      try {
        const savedSubs = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        const savedSubjects = localStorage.getItem(STORAGE_KEY_SUBJECTS);
        const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
        const { subjects: safeSubjects, submissions: safeSubmissions } = withoutCrtSubject(
          savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS,
          savedSubs ? JSON.parse(savedSubs) : {}
        );

        setSubmissions(safeSubmissions);
        setSubjects(safeSubjects);
        if (savedLogs) setActivityLogs(JSON.parse(savedLogs));
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(safeSubmissions));
        localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(safeSubjects));
      } catch (e) {
        console.warn('LocalStorage load error:', e);
      }
    }

    // Restore only a server-verified session from this browser tab.
    const savedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      try {
        const res = await authenticatedFetch('/api/session', { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (json?.success) {
          setUser(json.user);
        } else {
          sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    }

    setLoading(false);
  }, []);

  // 2. Realtime SSE: Live updates between all devices on the local network!
  useEffect(() => {
    loadData();

    let eventSource = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'submission_update') {
            const { studentId, subjectId, submitted, lastUpdated: newTime, log } = payload;
            setSubmissions((prev) => ({
              ...prev,
              [`${studentId}_${subjectId}`]: submitted,
            }));
            if (newTime) setLastUpdated(new Date(newTime));
            if (log) setActivityLogs((prev) => [log, ...prev.slice(0, 49)]);
          } else if (payload.type === 'bulk_update') {
            const { submissions: newSubs, lastUpdated: newTime, log } = payload;
            if (newSubs) setSubmissions(withoutCrtSubject([], newSubs).submissions);
            if (newTime) setLastUpdated(new Date(newTime));
            if (log) setActivityLogs((prev) => [log, ...prev.slice(0, 49)]);
          } else if (payload.type === 'subjects_update') {
            const { subjects: newSubjects, lastUpdated: newTime } = payload;
            if (newSubjects) setSubjects(newSubjects);
            if (newTime) setLastUpdated(new Date(newTime));
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [loadData]);

  // 3. Toggle single submission
  const toggleSubmission = useCallback(
    async (studentId, subjectId, currentStatus, studentName, subjectName) => {
      if (!user || !subjects.some((subject) => subject.id === subjectId)) return;
      const newStatus = !currentStatus;
      const key = `${studentId}_${subjectId}`;
      const now = new Date();
      const logDesc = `${newStatus ? 'Submitted' : 'Pending'}: ${studentName} (${subjectName})`;

      // 1. Optimistic state update in UI
      setSubmissions((prev) => {
        const next = { ...prev, [key]: newStatus };
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const newLog = {
        id: `log-${Date.now()}`,
        description: logDesc,
        created_at: now.toISOString(),
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 49)];
        try {
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setLastUpdated(now);
      showToast(newStatus ? `Marked ${studentName} as Done` : `Marked ${studentName} as Pending`);

      // 2. Persist locally to data/tracker_state.json
      try {
        await authenticatedFetch('/api/toggle-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            subjectId,
            submitted: newStatus,
            logDescription: logDesc,
          }),
        });
      } catch (err) {
        console.warn('Saved to browser localStorage only (local server offline).');
      }
    },
    [showToast, subjects, user]
  );

  // 4. Bulk update single subject
  const bulkUpdateSubject = useCallback(
    async (subjectId, submittedStatus, subjectName) => {
      if (!user || !subjects.some((subject) => subject.id === subjectId)) return;
      const now = new Date();
      const actionText = submittedStatus ? 'All marked Submitted' : 'All cleared (Pending)';
      const logDesc = `${actionText}: ${subjectName} (60 students)`;

      // Optimistic update
      setSubmissions((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          next[`${s.id}_${subjectId}`] = submittedStatus;
        });
        try {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const newLog = {
        id: `log-${Date.now()}`,
        description: logDesc,
        created_at: now.toISOString(),
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 49)];
        try {
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setLastUpdated(now);
      showToast(`${actionText} for ${subjectName}`);

      // Persist to local disk
      try {
        await authenticatedFetch('/api/bulk-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId,
            submitted: submittedStatus,
            logDescription: logDesc,
          }),
        });
      } catch (err) {
        console.warn('Saved to browser localStorage only.');
      }
    },
    [students, showToast, subjects, user]
  );

  // 5. Update subject title & due date
  const updateSubjectMeta = useCallback(
    async (subjectId, assignmentTitle, dueDate) => {
      if (!user || !subjects.some((subject) => subject.id === subjectId)) return;
      setSubjects((prev) => {
        const next = prev.map((s) =>
          s.id === subjectId
            ? { ...s, assignment_title: assignmentTitle, due_date: dueDate }
            : s
        );
        try {
          localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      showToast('Subject assignment details updated');

      try {
        await authenticatedFetch('/api/update-subject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId,
            assignmentTitle,
            dueDate,
          }),
        });
      } catch (err) {
        console.warn('Saved to browser localStorage.');
      }
    },
    [showToast, subjects, user]
  );

  // 6. Admin Authentication
  const login = async (username, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const error = new Error(
        res.status === 401
          ? 'Incorrect username or password'
          : json.error || 'Unable to sign in.'
      );
      error.incorrectCredentials = res.status === 401;
      error.retryAfter = Number(json.retryAfter) || 0;
      throw error;
    }

    setUser(json.user);
    sessionStorage.setItem(STORAGE_KEY_TOKEN, json.token);
    return json;
  };

  const logout = async () => {
    let revokeFailed = false;
    try {
      await authenticatedFetch('/api/logout', { method: 'POST' });
    } catch {
      revokeFailed = true;
    }
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    showToast(
      revokeFailed
        ? 'Signed out locally; the server could not revoke this session.'
        : 'CR Admin signed out',
      revokeFailed ? 'error' : 'success'
    );
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!user) return;
    const res = await authenticatedFetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Unable to change password.');
    }
    showToast('Password changed successfully');
  };

  // 7. Reset ALL submissions to pending across all subjects
  const resetAllSubmissions = useCallback(
    async () => {
      if (!user) return;
      const now = new Date();
      const emptyMap = {};
      students.forEach((s) => {
        subjects.forEach((sub) => {
          emptyMap[`${s.id}_${sub.id}`] = false;
        });
      });

      setSubmissions(emptyMap);
      setLastUpdated(now);

      const newLog = {
        id: `log-${Date.now()}`,
        description: 'RESET: All submissions cleared to Pending (all 60 students, all 5 subjects)',
        created_at: now.toISOString(),
      };
      setActivityLogs((prev) => {
        const next = [newLog, ...prev.slice(0, 49)];
        try { localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(next)); } catch (e) {}
        return next;
      });

      try { localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(emptyMap)); } catch (e) {}

      // Persist each subject's bulk-clear to local server
      try {
        const promises = subjects.map((sub) =>
          authenticatedFetch('/api/bulk-submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId: sub.id,
              submitted: false,
              logDescription: null,
            }),
          }).catch(() => {})
        );
        await Promise.all(promises);
        // Write a final log entry to file
        await authenticatedFetch('/api/bulk-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: subjects[0]?.id,
            submitted: false,
            logDescription: newLog.description,
          }),
        }).catch(() => {});
      } catch (err) {}

      showToast('All submissions reset to Pending');
    },
    [showToast, students, subjects, user]
  );

  // 8. Local JSON Backup and Restore
  const exportLocalBackup = () => {
    if (!user) return;
    const { subjects: safeSubjects, submissions: safeSubmissions } = withoutCrtSubject(
      subjects,
      submissions
    );
    const backupData = {
      version: 1,
      className: 'AIML Batch 1',
      exportedAt: new Date().toISOString(),
      students,
      subjects: safeSubjects,
      submissions: safeSubmissions,
      activityLogs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIML_Batch_1_Tracker_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded local JSON backup');
  };

  const importLocalBackup = (jsonData) => {
    if (!user) return;
    try {
      const { subjects: safeSubjects, submissions: safeSubmissions } = withoutCrtSubject(
        jsonData.subjects || DEFAULT_SUBJECTS,
        jsonData.submissions || {}
      );
      if (jsonData.students) setStudents(jsonData.students);
      setSubjects(safeSubjects);
      setSubmissions(safeSubmissions);
      if (jsonData.activityLogs) setActivityLogs(jsonData.activityLogs);
      setLastUpdated(new Date());

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(safeSubmissions));
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(safeSubjects));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(jsonData.activityLogs || []));

      // Also send to local file server if running
      authenticatedFetch('/api/bulk-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissions: safeSubmissions,
          subjects: safeSubjects,
        }),
      }).catch(() => {});

      showToast('Local database restored from backup file');
    } catch (err) {
      showToast('Failed to import backup: invalid file format', 'error');
    }
  };

  const isAdmin = Boolean(user);

  return (
    <TrackerContext.Provider
      value={{
        students,
        subjects,
        submissions,
        activityLogs,
        user,
        isAdmin,
        loading,
        lastUpdated,
        toastMessage,
        hasLocalFileServer,
        toggleSubmission,
        bulkUpdateSubject,
        updateSubjectMeta,
        refreshData: loadData,
        login,
        logout,
        changePassword,
        showToast,
        exportLocalBackup,
        importLocalBackup,
        resetAllSubmissions,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used within a TrackerProvider');
  return ctx;
}
