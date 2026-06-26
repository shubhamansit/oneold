"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HMC_ROUTE } from "@/lib/authUsers";
import { useHmcAuth } from "@/lib/useHmcAuth";

export default function WelcomePage() {
  const router = useRouter();
  const { isAllowed, isChecking } = useHmcAuth();

  useEffect(() => {
    if (!isChecking && isAllowed) {
      router.replace(HMC_ROUTE);
    }
  }, [isAllowed, isChecking, router]);

  return null;
}
