import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './layouts/AppLayout';
import ProtectedRoute, { PublicOnlyRoute, homeFor } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import ResidentDashboard from './pages/resident/Dashboard';
import CreateReport from './pages/resident/CreateReport';
import MyReports from './pages/resident/MyReports';
import ReportDetail from './pages/resident/ReportDetail';
import Feed from './pages/resident/Feed';
import Community from './pages/resident/Community';
import LostFound from './pages/resident/LostFound';
import Notifications from './pages/resident/Notifications';
import Chat from './pages/resident/Chat';
import Profile from './pages/resident/Profile';
import Settings from './pages/resident/Settings';

import StaffTasks from './pages/staff/Tasks';
import StaffCompleted from './pages/staff/Completed';

import AdminDashboard from './pages/admin/Dashboard';
import AdminReports from './pages/admin/Reports';
import AdminUsers from './pages/admin/Users';
import AdminStaff from './pages/admin/Staff';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminExport from './pages/admin/Export';

import NotFound from './pages/NotFound';

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public authentication screens */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />

      {/* Signed-in application */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Resident */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute roles={['resident']}><ResidentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/reports/new"
          element={<ProtectedRoute roles={['resident']}><CreateReport /></ProtectedRoute>}
        />
        <Route
          path="/reports"
          element={<ProtectedRoute roles={['resident']}><MyReports /></ProtectedRoute>}
        />
        <Route
          path="/reports/:id"
          element={<ProtectedRoute roles={['resident']}><ReportDetail /></ProtectedRoute>}
        />
        {/* Shared across roles */}
        <Route path="/messages" element={<Chat />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/community" element={<Community />} />
        <Route
          path="/lost-found"
          element={<ProtectedRoute roles={['resident', 'admin']}><LostFound /></ProtectedRoute>}
        />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />

        {/* Staff */}
        <Route
          path="/staff/tasks"
          element={<ProtectedRoute roles={['staff']}><StaffTasks /></ProtectedRoute>}
        />
        <Route
          path="/staff/completed"
          element={<ProtectedRoute roles={['staff']}><StaffCompleted /></ProtectedRoute>}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/reports"
          element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>}
        />
        <Route
          path="/admin/users"
          element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>}
        />
        <Route
          path="/admin/staff"
          element={<ProtectedRoute roles={['admin']}><AdminStaff /></ProtectedRoute>}
        />
        <Route
          path="/admin/announcements"
          element={<ProtectedRoute roles={['admin']}><AdminAnnouncements /></ProtectedRoute>}
        />
        <Route
          path="/admin/export"
          element={<ProtectedRoute roles={['admin']}><AdminExport /></ProtectedRoute>}
        />
      </Route>

      <Route path="/" element={<RoleHome />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
