import { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx';
import ResetPassword from './components/auth/ResetPassword.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import FileUpload from './components/files/FileUpload.jsx';
import FileList from './components/files/FileList.jsx';
import RecordsList from './components/files/RecordsList.jsx';
import ReportGenerator from './components/reports/ReportGenerator.jsx';
import ReportsList from './components/reports/ReportsList.jsx';

const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setFileRefreshKey((prev) => prev + 1);
  };

  const handleReportGenerated = () => {
    setReportRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="flex-1 pt-24">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 md:px-6">
            <Outlet context={{ fileRefreshKey, handleUploadComplete, reportRefreshKey, handleReportGenerated }} />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

const UploadPage = () => {
  const { fileRefreshKey, handleUploadComplete } = useOutletContext();
  return (
    <div className="space-y-6">
      <FileUpload onUploadComplete={handleUploadComplete} />
      <FileList refreshTrigger={fileRefreshKey} onChanged={handleUploadComplete} />
    </div>
  );
};

const ReportsPage = () => {
  const { reportRefreshKey, handleReportGenerated } = useOutletContext();
  return (
    <div className="space-y-6">
      <ReportGenerator onGenerated={handleReportGenerated} />
      <ReportsList refreshKey={reportRefreshKey} />
    </div>
  );
};

const RecordsPage = () => {
  const { fileRefreshKey } = useOutletContext();
  return (
    <div className="space-y-6">
      <RecordsList refreshKey={fileRefreshKey} />
    </div>
  );
};

const ProtectedApp = () => (
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    <Route element={<ProtectedApp />}>
      <Route index element={<Dashboard />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/records" element={<RecordsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
