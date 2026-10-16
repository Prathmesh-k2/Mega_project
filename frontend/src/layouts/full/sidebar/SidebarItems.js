import React from 'react';
import Menuitems from './MenuItems';
import { useLocation } from 'react-router';
import { Box, List } from '@mui/material';
import NavItem from './NavItem';
import NavGroup from './NavGroup/NavGroup';
import { useSelector } from 'react-redux';

const SidebarItems = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const isStudent = userInfo?.role === 'student';
  const isAdmin = userInfo?.role === 'admin';
  const studentLinks = new Set(['/dashboard', '/exam', '/result', '/user/account']);
  const studentSections = new Set(['Home', 'Student']);
  const adminSections = new Set(['Monitoring & Analytics']);

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
          if (isStudent && item.href && !studentLinks.has(item.href)) return null;
          if (isStudent && item.navlabel && !studentSections.has(item.subheader)) return null;
          if (isAdmin && item.href && item.href !== '/admin-dashboard') return null;
          if (isAdmin && item.navlabel && !adminSections.has(item.subheader)) return null;

          if (item.navlabel) {
            return <NavGroup item={item} key={item.subheader} />;
          }

          return <NavItem item={item} key={item.id} pathDirect={pathDirect} />;
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
