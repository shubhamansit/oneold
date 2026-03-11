// components/SidebarWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the AppSidebar with SSR disabled
const AppSidebar = dynamic(() => import('./Sidebar').then(mod => mod.AppSidebar), {
  ssr: false,
});

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render the sidebar on the client side
  if (!isClient) {
    return <>{children}</>;
  }

  return <AppSidebar>{children}</AppSidebar>;
}
