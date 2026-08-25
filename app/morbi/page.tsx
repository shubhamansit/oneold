"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isMorbiUser } from "@/lib/authUsers";

interface AuthPayload {
  email: string;
}

export default function MorbiWelcomePage() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = Cookies.get("isAuthenticated");

    if (!token) {
      router.push("/");
      return;
    }

    try {
      const decoded = jwt.verify(token, "SUPERSECRET") as AuthPayload;
      if (!isMorbiUser(decoded.email?.toLowerCase())) {
        router.push("/");
        return;
      }
      setIsAllowed(true);
    } catch {
      router.push("/");
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking || !isAllowed) {
    return null;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-2rem)] flex-col items-center justify-center px-6 py-10">
      <Image
        src="/image.png"
        width={120}
        height={120}
        alt="Logo"
        className="mb-6 rounded-full"
      />
      <h1 className="text-2xl font-semibold text-gray-900">Welcome</h1>
    </div>
  );
}
