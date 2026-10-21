"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import { useRouter } from "next/navigation";
import { isBardoliUser } from "@/lib/authUsers";

interface AuthPayload {
  email: string;
}

export default function BardoliIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("isAuthenticated");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const decoded = jwt.verify(token, "SUPERSECRET") as AuthPayload;
      // Like Bhavnagar: open Job Summary directly, no welcome/button screen
      router.replace(
        isBardoliUser(decoded.email?.toLowerCase())
          ? "/bardoli/jobsummary"
          : "/"
      );
    } catch {
      router.replace("/");
    }
  }, [router]);

  return null;
}
