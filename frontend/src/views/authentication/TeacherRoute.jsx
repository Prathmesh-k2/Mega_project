import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const TeacherRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const canAccessTeacherTools = ['teacher', 'admin'].includes(userInfo?.role);

  return canAccessTeacherTools ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
export default TeacherRoute;
