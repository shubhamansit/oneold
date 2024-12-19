import { NextRequest, NextResponse } from "next/server";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  console.log(searchParams.toString());
  const res = await fetch(
    "http://one.ansitindia.com/webservice?" + searchParams.toString()
  );
  const data = await res.json();

  const updatedData = data.data.vehicles.map((vehicle: any) => {
    const { jobs, ...rest } = vehicle; // Destructure to separate jobs from the rest
    const job = jobs[0]; // Assume the first job object
    return { ...rest, ...job }; // Merge vehicle and job objects
  });
  return NextResponse.json({
    data: {
      vehicles: updatedData,
    },
  });
}
