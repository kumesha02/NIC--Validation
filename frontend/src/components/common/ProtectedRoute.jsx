import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Verifying session..." />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
