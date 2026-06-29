"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Home,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Download,
  MessageCircle,
  PlayCircle,
  Apple,
  LocateIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import jwt, { JwtPayload } from "jsonwebtoken";
import { getCookie } from "cookies-next/client";
import { isDaywiseDistanceUser, isHmcUser } from "@/lib/authUsers";

interface customeJwtPayload extends JwtPayload {
  email: string;
}

function decodeAuthCookie(value?: string): customeJwtPayload | undefined {
  if (!value) return undefined;

  try {
    const decoded = jwt.verify(value, "SUPERSECRET") as customeJwtPayload;
    return {
      ...decoded,
      email: decoded.email?.toLowerCase(),
    };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return undefined;
  }
}

const menuItems = [
  { id: "menu_01", title: "Dashboard", icon: Home, href: "#" },
  { id: "menu_02", title: "Tracking", icon: LocateIcon, href: "#" },
  {
    id: "menu_03",
    title: "Reports",
    icon: FileText,
    href: "#",
    subMenu: [
      {
        title: "Job",
        items: [
          {
            name: "Job Summary",
            href: "/jobsummary",
          },
          {
            name: "Job Details Summary",
            href: "/jobdetailssummary",
          },
        ],
      },
    ],
  },
  { id: "menu_04", title: "Settings", icon: Settings, href: "#" },
];

// Error boundary component to handle React errors
class SidebarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.warn("Sidebar error:", error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Sidebar error details:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback: render children without sidebar
      return <>{this.props.children}</>;
    }

    return this.props.children;
  }
}

// Wrapper component to handle navigation context errors
function SafeAppSidebar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarErrorBoundary>
      <AppSidebarContent>{children}</AppSidebarContent>
    </SidebarErrorBoundary>
  );
}

function AppSidebarContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Safety check: ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  const [data, setData] = React.useState<customeJwtPayload>();
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = React.useState({
    top: 0,
    left: 0,
  });
  const submenuRef = React.useRef<HTMLDivElement>(null);
  const menuItemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const currentCookieValue = getCookie("isAuthenticated")?.toString();
  const currentCookieData = React.useMemo(() => {
    return decodeAuthCookie(currentCookieValue);
  }, [currentCookieValue]);

  const activeData = currentCookieValue ? currentCookieData : undefined;
  
  React.useEffect(() => {
    const decodedData = decodeAuthCookie(getCookie("isAuthenticated")?.toString());

    setOpenSubmenu(null);
    setData(decodedData);
    setIsLoading(false);

    if (!decodedData && pathname !== "/") {
      router.replace("/");
    }
  }, [pathname, router]);

  // Handle loading and authentication states within JSX to avoid hooks order issues

  const handleMouseEnter = (id: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const anchor = menuItemRefs.current[id];
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setSubmenuPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    }

    setOpenSubmenu(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenSubmenu(null);
    }, 300); // Delay before closing submenu
  };

  const handleLogout = () => {
    setData(undefined);
    setOpenSubmenu(null);
    setIsLoading(false);
    document.cookie =
      "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/");
    router.refresh();
  };

  React.useEffect(() => {
    // Check if we're in the browser environment
    if (typeof document === "undefined") {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(event.target as Node)
      ) {
        setOpenSubmenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    setOpenSubmenu(null);
  }, [activeData?.email, pathname]);

  // Handle root path condition within JSX to avoid hooks order issues

  return (
    <>
      {isLoading ? (
        <div>Loading...</div>
      ) : !activeData ? (
        children
      ) : pathname === "/" ? (
        children
      ) : (
        <SidebarProvider>
          <Sidebar className=" bg-[#f2f2f2] text-gray-700">
        <SidebarHeader className="p-2">
          <Avatar className="w-16 h-16 mx-auto">
            {activeData?.email == "osc@swm.com" ? (
              <AvatarImage src="/image2.png" alt="Logo" />
            ) : (
              <AvatarImage src="/image.png" alt="Logo" />
            )}
            <AvatarFallback>Logo</AvatarFallback>
          </Avatar>
        </SidebarHeader>
        <SidebarContent className="overflow-visible">
          <SidebarMenu>
            {(() => {
              const email = activeData!.email.toLowerCase();
              const reportSubMenu = isHmcUser(email)
                ? [
                    {
                      title: "Reports",
                      items: [
                        {
                          name: "Route Detail Summary",
                          href: "/jobdetails",
                        },
                      ],
                    },
                  ]
                : isDaywiseDistanceUser(email)
                ? [
                    {
                      title: "Nashik Waste",
                      items: [
                        {
                          name: "Daywise Distance",
                          href: "/daywisedistance",
                        },
                      ],
                    },
                  ]
                : email === "bhavnagar@gmail.com"
                ? [
                    {
                      title: "Job",
                      items: [
                        {
                          name: "Work Hour Summary",
                          href: "/worksummary",
                        },
                        {
                          name: "Swipper Summary",
                          href: "/swippersummary",
                        },
                      ],
                    },
                  ]
                : email === "osc@swm.com"
                ? [
                    {
                      title: "Job",
                      items: [
                        {
                          name: "Job Summary",
                          href: "/jobsummary",
                        },
                        {
                          name: "Job Details Summary",
                          href: "/jobdetailssummary",
                        },
                      ],
                    },
                    {
                      title: "Present",
                      items: [
                        {
                          name: "Present Summary",
                          href: "/presentsummary",
                        },
                      ],
                    },
                  ]
                : email === "bmcswippr@gmail.com"
                ? [
                    {
                      title: "Job",
                      items: [
                        {
                          name: "Summary",
                          href: "/summary",
                        },
                      ],
                    },
                  ]
                : [];

              const menuItems = isDaywiseDistanceUser(email)
                ? []
                : isHmcUser(email)
                ? [
                    {
                      id: "menu_03",
                      title: "Reports",
                      icon: FileText,
                      href: "#",
                      subMenu: reportSubMenu,
                    },
                  ]
                : [
                    { id: "menu_01", title: "Dashboard", icon: Home, href: "#" },
                    {
                      id: "menu_02",
                      title: "Tracking",
                      icon: LocateIcon,
                      href: "#",
                    },
                    {
                      id: "menu_03",
                      title: "Reports",
                      icon: FileText,
                      href: "#",
                      subMenu: reportSubMenu,
                    },
                    {
                      id: "menu_04",
                      title: "Settings",
                      icon: Settings,
                      href: "#",
                    },
                  ];
              
              return menuItems.map((item, index) => (
              <div
                key={index}
                className="relative"
                ref={(node) => {
                  menuItemRefs.current[item.id] = node;
                }}
              >
                <SidebarMenuItem
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <SidebarMenuButton
                    asChild
                    className="flex h-20 flex-col items-center justify-center"
                  >
                    <Button variant="ghost" className="h-full w-full">
                      <item.icon className="mb-1 h-6 w-6" />
                      <span className="text-xs">{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {item.subMenu &&
                  openSubmenu === item.id &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      ref={submenuRef}
                      style={{
                        position: "fixed",
                        top: submenuPosition.top,
                        left: submenuPosition.left,
                        zIndex: 9999,
                      }}
                      className="w-64 overflow-hidden rounded-md border border-[#c93c3c] bg-[#DB4848] shadow-lg"
                      onMouseEnter={() => handleMouseEnter(item.id)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {item.subMenu.map((group, groupIndex) => (
                        <div key={groupIndex}>
                          <div className="border-b border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                            {group.title}
                          </div>
                          {group.items?.map((subItem, subIndex) => (
                            <Link
                              key={subIndex}
                              href={subItem.href}
                              className="block px-3 py-2.5 text-sm text-white transition-colors hover:bg-black/20"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>,
                    document.body
                  )}
              </div>
            ));
            })()}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto">
          {isDaywiseDistanceUser(activeData.email) ||
          isHmcUser(activeData.email) ? (
            <div className="flex flex-col items-center gap-2 p-2">
              <Button
                variant="ghost"
                size="icon"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut className="h-6 w-6" />
              </Button>
              <span className="text-xs">Logout</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-2">
              {[
                { icon: HelpCircle, title: "Help" },
                { icon: LogOut, title: "Sign out" },
                { icon: Download, title: "Cloud Download" },
                { icon: MessageCircle, title: "Support" },
              ].map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  title={item.title}
                  onClick={item.title === "Sign out" ? handleLogout : undefined}
                >
                  <item.icon className="h-6 w-6" />
                </Button>
              ))}
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" title="Share Android App">
                  <PlayCircle className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" title="Share iOS App">
                  <Apple className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </SidebarProvider>
      )}
    </>
  );
}

// Export the safe wrapper as the main component
export { SafeAppSidebar as AppSidebar };
