import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import initialStudents from '../data/students_seed.json';
import { DEFAULT_SUBJECTS } from '../../shared/defaultData.js';
import { withoutCrtSubject } from '../../shared/subjectMigration.js';

const TrackerContext = createContext(null);
const STORAGE_KEY_SUBMISSIONS = 'cr_local_submissions_v1';
const STORAGE_KEY_SUBJECTS = 'cr_local_subjects_v1';
const STORAGE_KEY_LOGS = 'cr_local_logs_v1';
const STORAGE_KEY_STUDENTS = 'cr_local_students_v1';
const STORAGE_KEY_IMPORT_DONE = 'cr_tracker_cloud_import_done';

export { DEFAULT_SUBJECTS };

export const INITIAL_STUDENTS = initialStudents.map((student, index) => ({
  id: `stu-${index + 1}`,
  sno: student.sno,
  name: student.name,
  roll_number: student.roll_number,
}));

async function responseJson(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok || !body.success) {
    const error = new Error(body.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.retryAfter = Number(body.retryAfter) || 0;
    error.incorrectCredentials = response.status === 401 &&
      body.error === 'Incorrect username or password';
    throw error;
  }
  return body;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return responseJson(response);
}

export function TrackerProvider({ children }) {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [submissions, setSubmissions] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [importedLocalData, setImportedLocalData] = useState(
    () => localStorage.getItem(STORAGE_KEY_IMPORT_DONE) === 'true'
  );
  const toastTimeoutRef = useRef(null);
  const pendingSubmissionChanges = useRef(new Map());
  const pendingSubjectChanges = useRef(new Map());
  const retryOperationRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text: message, type });
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const fetchState = useCallback(async ({ initial = false, preserveError = false } = {}) => {
    if (initial) setLoading(true);
    try {
      const response = await fetch('/api/state', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (response.status === 401) {
        setUser(null);
        return false;
      }

      const body = await responseJson(response);
      const data = body.data;
      const migrated = withoutCrtSubject(data.subjects || DEFAULT_SUBJECTS, data.submissions || {});
      setStudents(Array.isArray(data.students) ? data.students : INITIAL_STUDENTS);
      setSubjects(migrated.subjects);
      setSubmissions((current) => {
        const next = { ...migrated.submissions };
        for (const [key, value] of pendingSubmissionChanges.current) next[key] = value;
        return next;
      });
      setSubjects((current) => {
        const next = [...migrated.subjects];
        for (const [subjectId, subject] of pendingSubjectChanges.current) {
          const index = next.findIndex((item) => item.id === subjectId);
          if (index >= 0) next[index] = subject;
        }
        return next;
      });
      setActivityLogs(Array.isArray(data.activityLogs) ? data.activityLogs : []);
      if (data.lastUpdated) setLastUpdated(new Date(data.lastUpdated));
      setImportedLocalData(Boolean(data.importedLocalData));
      setUser((current) => current || { role: 'admin' });
      setLastSyncedAt(new Date());
      if (!preserveError && !retryOperationRef.current) setSyncError('');
      return true;
    } catch (error) {
      if (!preserveError) {
        setSyncError(error.message || 'Unable to load shared tracker data.');
        if (!retryOperationRef.current) retryOperationRef.current = () => fetchState({ preserveError: true });
      }
      return false;
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState({ initial: true });
  }, [fetchState]);

  useEffect(() => {
    if (!user) return undefined;
    const sync = () => fetchState();
    const interval = window.setInterval(sync, 5000);
    window.addEventListener('focus', sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sync);
    };
  }, [user, fetchState]);

  const markMutationFailed = useCallback((error, retry) => {
    const message = error.message || 'Could not save your change.';
    setSyncError(message);
    retryOperationRef.current = retry;
    showToast('Save failed. Use Retry in the header to try again.', 'error');
  }, [showToast]);

  const sendMutation = useCallback(async (url, payload, rollback = () => {}) => {
    try {
      await postJson(url, payload);
      setSyncError('');
      retryOperationRef.current = null;
      setLastSyncedAt(new Date());
      await fetchState();
      return true;
    } catch (error) {
      rollback();
      markMutationFailed(error, () => sendMutation(url, payload));
      await fetchState({ preserveError: true });
      return false;
    }
  }, [fetchState, markMutationFailed]);

  const retrySync = useCallback(async () => {
    if (!retryOperationRef.current) return;
    const retry = retryOperationRef.current;
    retryOperationRef.current = null;
    await retry();
  }, []);

  const toggleSubmission = useCallback(async (
    studentId,
    subjectId,
    currentStatus,
    studentName,
    subjectName
  ) => {
    if (!user || !students.some((student) => student.id === studentId) ||
      !subjects.some((subject) => subject.id === subjectId)) return;
    const submitted = !currentStatus;
    const key = `${studentId}_${subjectId}`;
    pendingSubmissionChanges.current.set(key, submitted);
    setSubmissions((current) => ({ ...current, [key]: submitted }));
    const succeeded = await sendMutation('/api/toggle', { studentId, subjectId, submitted }, () => {
      pendingSubmissionChanges.current.delete(key);
      setSubmissions((current) => ({ ...current, [key]: currentStatus }));
    });
    if (succeeded) {
      pendingSubmissionChanges.current.delete(key);
      showToast(`${submitted ? 'Marked' : 'Unmarked'} ${studentName} for ${subjectName}`);
    }
  }, [sendMutation, showToast, students, subjects, user]);

  const bulkUpdateSubject = useCallback(async (subjectId, submittedStatus, subjectName) => {
    if (!user || !subjects.some((subject) => subject.id === subjectId)) return;
    const previous = {};
    for (const student of students) {
      const key = `${student.id}_${subjectId}`;
      previous[key] = Boolean(submissions[key]);
      pendingSubmissionChanges.current.set(key, submittedStatus);
    }
    setSubmissions((current) => ({ ...current, ...Object.fromEntries(
      students.map((student) => [`${student.id}_${subjectId}`, submittedStatus])
    ) }));
    const succeeded = await sendMutation('/api/bulk', {
      subjectId,
      submitted: submittedStatus,
    }, () => {
      for (const [key, value] of Object.entries(previous)) {
        pendingSubmissionChanges.current.delete(key);
        setSubmissions((current) => ({ ...current, [key]: value }));
      }
    });
    if (succeeded) {
      for (const student of students) pendingSubmissionChanges.current.delete(`${student.id}_${subjectId}`);
      showToast(`${submittedStatus ? 'All marked Submitted' : 'All cleared'} for ${subjectName}`);
    }
  }, [sendMutation, showToast, students, submissions, subjects, user]);

  const updateSubjectMeta = useCallback(async (subjectId, assignmentTitle, dueDate) => {
    if (!user) return;
    const previous = subjects.find((subject) => subject.id === subjectId);
    if (!previous) return;
    const updated = { ...previous, assignment_title: assignmentTitle, due_date: dueDate };
    pendingSubjectChanges.current.set(subjectId, updated);
    setSubjects((current) => current.map((subject) => subject.id === subjectId ? updated : subject));
    const succeeded = await sendMutation('/api/subject-update', {
      subjectId,
      assignmentTitle,
      dueDate,
    }, () => {
      pendingSubjectChanges.current.delete(subjectId);
      setSubjects((current) => current.map((subject) => subject.id === subjectId ? previous : subject));
    });
    if (succeeded) {
      pendingSubjectChanges.current.delete(subjectId);
      showToast('Subject assignment details updated');
    }
  }, [sendMutation, showToast, subjects, user]);

  const login = async (username, password) => {
    const body = await postJson('/api/login', { username, password });
    setUser({ role: 'admin' });
    if (!(await fetchState())) {
      setUser(null);
      throw new Error('Signed in, but shared tracker data could not be loaded. Please retry.');
    }
    return body;
  };

  const logout = async () => {
    try {
      await postJson('/api/logout', {});
      setSyncError('');
      showToast('CR signed out');
    } catch (error) {
      showToast(error.message || 'Unable to sign out. Please retry.', 'error');
    } finally {
      setUser(null);
      sessionStorage.removeItem('cr_local_admin_session');
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!user) return;
    await postJson('/api/change-password', { oldPassword, newPassword });
    showToast('Password changed successfully');
  };

  const resetAllSubmissions = useCallback(async () => {
    if (!user) return;
    const previous = submissions;
    const empty = Object.fromEntries(
      students.flatMap((student) => subjects.map((subject) => [`${student.id}_${subject.id}`, false]))
    );
    setSubmissions(empty);
    const succeeded = await sendMutation('/api/reset', {}, () => setSubmissions(previous));
    if (succeeded) showToast('All submissions reset to Pending');
  }, [sendMutation, showToast, students, submissions, subjects, user]);

  const buildBackup = useCallback(() => ({
    version: 1,
    className: 'AIML Batch 1',
    exportedAt: new Date().toISOString(),
    students,
    subjects: withoutCrtSubject(subjects, submissions).subjects,
    submissions: withoutCrtSubject(subjects, submissions).submissions,
    activityLogs,
  }), [activityLogs, students, submissions, subjects]);

  const exportLocalBackup = useCallback(() => {
    if (!user) return;
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AIML_Batch_1_Tracker_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON backup');
  }, [buildBackup, showToast, user]);

  const importLocalBackup = useCallback(async (jsonData) => {
    if (!user) return;
    try {
      const restored = await sendMutation('/api/restore', { data: jsonData });
      if (!restored) return;
      showToast('Shared tracker restored from backup');
    } catch (error) {
      showToast(`Restore failed: ${error.message}`, 'error');
    }
  }, [sendMutation, showToast, user]);

  const importCurrentLocalData = useCallback(async () => {
    if (!user || importedLocalData) return;
    try {
      const savedSubjects = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (!savedSubjects && !savedSubmissions && !savedLogs && !savedStudents) {
        throw new Error('No saved tracker data was found for this website origin. Use Restore to upload a JSON backup.');
      }
      const data = {
        students: savedStudents ? JSON.parse(savedStudents) : INITIAL_STUDENTS,
        subjects: savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS,
        submissions: savedSubmissions ? JSON.parse(savedSubmissions) : {},
        activityLogs: savedLogs ? JSON.parse(savedLogs) : [],
      };
      const migrated = withoutCrtSubject(data.subjects, data.submissions);
      const imported = await sendMutation('/api/import', { data: { ...data, ...migrated } });
      if (!imported) return;
      localStorage.setItem(STORAGE_KEY_IMPORT_DONE, 'true');
      setImportedLocalData(true);
      await fetchState();
      showToast('Your browser data was imported to shared cloud storage');
    } catch (error) {
      showToast(`Import failed: ${error.message}`, 'error');
    }
  }, [fetchState, importedLocalData, sendMutation, showToast, user]);

  const isAdmin = Boolean(user);

  return (
    <TrackerContext.Provider value={{
      students,
      subjects,
      submissions,
      activityLogs,
      user,
      isAdmin,
      loading,
      lastUpdated,
      lastSyncedAt,
      syncError,
      toastMessage,
      importedLocalData,
      toggleSubmission,
      bulkUpdateSubject,
      updateSubjectMeta,
      refreshData: () => fetchState(),
      retrySync,
      login,
      logout,
      changePassword,
      showToast,
      exportLocalBackup,
      importLocalBackup,
      importCurrentLocalData,
      resetAllSubmissions,
    }}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) throw new Error('useTracker must be used within a TrackerProvider');
  return context;
}
