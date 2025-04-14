"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Create a loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    <p className="ml-2">Loading summary data...</p>
  </div>
);

// Dynamically import the component with no SSR
const WorkHourSummaryNoSSR = dynamic(
  () => import("@/components/WorkHourSummary2"),
  {
    ssr: false,
    loading: () => <LoadingComponent />,
  }
);

export default function SwipperSummaryPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <WorkHourSummaryNoSSR />
    </Suspense>
  );
}
