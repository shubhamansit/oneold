"use client";

import * as React from "react";
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

interface customeJwtPayload extends JwtPayload {
  email: string;
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

export function AppSidebar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [data, setData] = React.useState<customeJwtPayload>();
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  
  React.useEffect(() => {
    const value = getCookie("isAuthenticated")?.toString();
    if (value) {
      try {
        const data = jwt.verify(value, "SUPERSECRET") as customeJwtPayload;
        setData(data);
      } catch (error) {
        console.error('JWT verification failed:', error);
        if (typeof window !== 'undefined') {
          router.push("/");
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        router.push("/");
      }
    }
    setIsLoading(false);
  }, [router]);

  // Show loading or redirect if not authenticated
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <>{children}</>;
  }

  const menuItems = [
    { id: "menu_01", title: "Dashboard", icon: Home, href: "#" },
    { id: "menu_02", title: "Tracking", icon: LocateIcon, href: "#" },
    {
      id: "menu_03",
      title: "Reports",
      icon: FileText,
      href: "#",
      subMenu:
        data.email == "bhavnagar@gmail.com"
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
          : data.email == "osc@swm.com"
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
          : [
              {
                title: "Job",
                items: [
                  {
                    name: "Summary",
                    href: "/summary",
                  },
                ],
              },
            ],
    },
    { id: "menu_04", title: "Settings", icon: Settings, href: "#" },
  ];
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  const submenuRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (id: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpenSubmenu(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenSubmenu(null);
    }, 300); // Delay before closing submenu
  };

  React.useEffect(() => {
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

  // If the current path is root, just return children without sidebar
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar className=" bg-[#f2f2f2] text-gray-700">
        <SidebarHeader className="p-2">
          <Avatar className="w-16 h-16 mx-auto">
            {data?.email == "osc@swm.com" ? (
              <AvatarImage src="/image2.png" alt="Logo" />
            ) : (
              <AvatarImage src="/image.png" alt="Logo" />
            )}
            <AvatarFallback>Logo</AvatarFallback>
          </Avatar>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems?.map((item, index) => (
              <div key={index}>
                <SidebarMenuItem
                  key={index}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onMouseLeave={handleMouseLeave}
                  className="relative"
                >
                  <SidebarMenuButton
                    asChild
                    className="flex flex-col items-center justify-center h-20"
                  >
                    <Button variant="ghost" className=" h-full">
                      <item.icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {item.subMenu && openSubmenu === item.id && (
                  <div
                    ref={submenuRef}
                    className="absolute left-full top-52 ml-2 w-64 bg-white shadow-lg rounded-md overflow-hidden z-999"
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.subMenu.map((group, index) => (
                      <div
                        key={index}
                        className="p-2 bg-[#DB4848] flex flex-col my-2"
                      >
                        {group.title}
                        {group.items && group.items.map((subItem, subIndex) => (
                          <Link
                            key={subIndex}
                            href={subItem.href}
                            className=" hover:bg-zinc-900 text-white transition duration-150 ease-out hover:ease-in rounded p-2 text-sm pl-4"
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto">
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
        </SidebarFooter>
      </Sidebar>
      {children}
    </SidebarProvider>
  );
}
