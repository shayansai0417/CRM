import React, { useState, useEffect } from 'react';
import { TrackerProvider, useTracker } from './context/TrackerContext';
import Navbar from './components/Navbar';
import SummaryStats from './components/SummaryStats';
import StudentTable from './components/StudentTable';
import SubjectFocusMode from './components/SubjectFocusMode';
import SubjectCheckView from './components/SubjectCheckView';
import CRLoginPage from './components/CRLoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import SubjectEditModal from './components/SubjectEditModal';
import ActivityLogModal from './components/ActivityLogModal';
import ConfirmModal from './components/ConfirmModal';
import PrintReportView from './components/PrintReportView';
import { exportToCSV } from './utils/exportUtils';
import {
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

function subjectIdFromHash() {
  const match = window.location.hash.match(/^#\/subject\/([^/]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function TrackerApp() {
  const {
    isAdmin,
    loading,
    toastMessage,
    bulkUpdateSubject,
    resetAllSubmissions,
    students,
    subjects,
    submissions,
  } = useTracker();

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('cr_tracker_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cr_tracker_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cr_tracker_dark_mode', 'false');
    }
  }, [darkMode]);

  // View state: 'grid' (standard 6-subject table) or 'focus' (fast single-subject ticker for CR)
  const [viewMode, setViewMode] = useState('grid');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSubjectId, setActiveSubjectId] = useState(subjectIdFromHash);

  // Modals
  const [viewerMode, setViewerMode] = useState(
    () => sessionStorage.getItem('cr_tracker_viewer_mode') === 'true'
  );
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveSubjectId(subjectIdFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeSubjectId && !subjects.some((subject) => subject.id === activeSubjectId)) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      );
      setActiveSubjectId(null);
    }
  }, [activeSubjectId, subjects]);

  const openSubject = (subjectId) => {
    const nextHash = `#/subject/${encodeURIComponent(subjectId)}`;
    if (window.location.hash === nextHash) {
      setActiveSubjectId(subjectId);
    } else {
      window.location.hash = nextHash;
    }
  };

  const backToDashboard = () => {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`
    );
    setActiveSubjectId(null);
  };

  const continueAsViewer = () => {
    sessionStorage.setItem('cr_tracker_viewer_mode', 'true');
    setViewerMode(true);
  };

  const openCRLogin = () => {
    sessionStorage.removeItem('cr_tracker_viewer_mode');
    setViewerMode(false);
  };

  const handleLogout = () => {
    sessionStorage.setItem('cr_tracker_viewer_mode', 'true');
    setViewerMode(true);
  };

  const handleOpenConfirm = (config) => {
    setConfirmConfig(config);
  };

  const handleConfirmAction = () => {
    if (!isAdmin) {
      setConfirmConfig(null);
      return;
    }
    if (confirmConfig?.action) {
      const res = confirmConfig.action();
      if (res?.type === 'bulk') {
        bulkUpdateSubject(res.subjectId, res.status, res.name);
      } else if (res?.type === 'reset_all') {
        // Auto-backup CSV first, then reset
        const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        exportToCSV(students, subjects, submissions, `AIML_Batch1_PRE-RESET_Backup_${dateStr}.csv`);
        // Small delay so the download fires before state wipes
        setTimeout(() => {
          resetAllSubmissions();
        }, 300);
      }
    }
    setConfirmConfig(null);
  };

  const handleResetAll = () => {
    if (!isAdmin) return;
    setConfirmConfig({
      title: 'Reset All Submissions?',
      message:
        'This will mark all 60 students as Pending in all 5 subjects. This cannot be undone.\n\nA CSV backup of the current report will be downloaded automatically before resetting.',
      confirmText: 'Yes, Reset Everything',
      confirmVariant: 'danger',
      action: () => ({ type: 'reset_all' }),
    });
  };

  const selectedSubject = subjects.find((subject) => subject.id === activeSubjectId) || null;
  const subjectIndex = selectedSubject
    ? subjects.findIndex((subject) => subject.id === selectedSubject.id)
    : -1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        Loading report…
      </div>
    );
  }

  if (!isAdmin && !viewerMode) {
    return (
      <CRLoginPage
        onContinueAsViewer={continueAsViewer}
        onLoginSuccess={openCRLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-x-clip">

      {/* Printable Report View (Visible only during window.print) */}
      {selectedSubject ? null : <PrintReportView />}

      {/* Navigation Header */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        openLogModal={() => setLogModalOpen(true)}
        openChangePasswordModal={() => setChangePasswordModalOpen(true)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onResetAll={handleResetAll}
        onOpenLogin={openCRLogin}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Top Summary Metrics Cards */}
        {selectedSubject ? (
          <SubjectCheckView
            subject={selectedSubject}
            subjectIndex={subjectIndex}
            subjectCount={subjects.length}
            onBack={backToDashboard}
            onNavigateSubject={openSubject}
            onConfirmBulkUpdate={({ subjectId, submitted, subjectName }) => {
              if (!isAdmin) return;
              setConfirmConfig({
                title: submitted ? `Mark all ${subjectName} submissions?` : `Clear all ${subjectName} submissions?`,
                message: submitted
                  ? `Mark all ${students.length} students as submitted for ${subjectName}?`
                  : `Clear all submission statuses for ${subjectName}? This cannot be undone.`,
                confirmText: submitted ? 'Mark all submitted' : 'Clear all',
                confirmVariant: submitted ? 'success' : 'danger',
                action: () => ({ type: 'bulk', subjectId, status: submitted, name: subjectName }),
              });
            }}
          />
        ) : (
          <>
            <SummaryStats
              onEditSubject={(sub) => {
                if (isAdmin) setEditingSubject(sub);
              }}
              onOpenSubject={openSubject}
            />

            {/* View Switching: Full Grid Table vs Fast Subject Focus Mode */}
            {isAdmin && viewMode === 'focus' ? (
              <SubjectFocusMode
                onOpenConfirm={handleOpenConfirm}
                onEditSubject={(sub) => {
                  if (isAdmin) setEditingSubject(sub);
                }}
              />
            ) : (
              <StudentTable
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Save Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-sm font-semibold border ${
              toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isAdmin && changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      <SubjectEditModal
        isOpen={isAdmin && Boolean(editingSubject)}
        subject={editingSubject}
        onClose={() => setEditingSubject(null)}
      />

      <ActivityLogModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmConfig)}
        title={confirmConfig?.title || 'Confirm Action'}
        message={confirmConfig?.message || 'Are you sure you want to proceed?'}
        confirmText={confirmConfig?.confirmText || 'Confirm'}
        confirmVariant={confirmConfig?.confirmVariant || 'danger'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TrackerProvider>
      <TrackerApp />
    </TrackerProvider>
  );
}
