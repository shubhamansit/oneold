"use client";

import Image from "next/image";
import { useHmcAuth } from "@/lib/useHmcAuth";

export default function WelcomePage() {
  const { isAllowed, isChecking } = useHmcAuth();

  if (isChecking || !isAllowed) {
    return null;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-2rem)] flex-col items-center justify-center px-6 py-10">
      <Image
        src="/image.png"
        width={120}
        height={120}
        alt="HMC logo"
        className="mb-6 rounded-full"
      />
      <h1 className="text-2xl font-semibold text-gray-900">Welcome</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Select <span className="font-medium text-gray-800">Reports</span> from
        the left menu to view route detail summaries.
      </p>
    </div>
  );
}
