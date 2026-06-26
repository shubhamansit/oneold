"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import { useRouter } from "next/navigation";
import { isHmcUser } from "@/lib/authUsers";

interface AuthPayload {
  email: string;
}

export function useHmcAuth() {
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
      const email = decoded.email?.toLowerCase();

      if (!isHmcUser(email)) {
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

  return { isAllowed, isChecking };
}
