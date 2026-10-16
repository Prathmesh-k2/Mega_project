import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
  IconPlayerPlayFilled,
  IconUserCheck,
  IconChartBar,
  IconDeviceDesktopAnalytics
  ,IconUsers,
} from '@tabler/icons-react';

import { uniqueId } from 'lodash';

const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboard',
  },
  {
    navlabel: true,
    subheader: 'Student',
  },
  {
    id: uniqueId(),
    title: 'Exams',
    icon: IconTypography,
    href: '/exam',
  },
  {
    id: uniqueId(),
    title: 'Result',
    icon: IconCopy,
    href: '/result',
  },
  {
    id: uniqueId(),
    title: 'Update Password',
    icon: IconLogin,
    href: '/user/account',
  },
  {
    navlabel: true,
    subheader: 'Teacher',
  },
  {
    id: uniqueId(),
    title: 'Create Exam',
    icon: IconMoodHappy,
    href: '/create-exam',
  },
  {
    id: uniqueId(),
    title: 'Exam Logs',
    icon: IconUserPlus,
    href: '/exam-log',
  },
  {
    id: uniqueId(),
    title: 'User Approvals',
    icon: IconUserCheck,
    href: '/user-approvals',
  },
  {
    navlabel: true,
    subheader: 'Monitoring & Analytics',
  },
  {
    id: uniqueId(),
    title: 'Admin Dashboard',
    icon: IconDeviceDesktopAnalytics,
    href: '/admin-dashboard',
  },
  {
    id: uniqueId(),
    title: 'Students',
    icon: IconUsers,
    href: '/admin/students',
  },
  {
    id: uniqueId(),
    title: 'Analytics',
    icon: IconChartBar,
    href: '/analytics',
  },
  // {
  //   id: uniqueId(),
  //   title: 'Exam  Sale comp',
  //   icon: IconPlayerPlayFilled,
  //   href: '/generate-report',
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Sample Page',
  //   icon: IconAperture,
  //   href: '/sample-page',
  // },
];

export default Menuitems;
