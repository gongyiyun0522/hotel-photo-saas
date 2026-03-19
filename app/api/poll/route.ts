import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  const id = req.nextUrl.searchParams.get("id");

  if (!token || !id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to poll" }, { status: response.status });
  }

  const prediction = await response.json();
  return NextResponse.json({
    status: prediction.status,
    output: prediction.output,
    error: prediction.error,
  });
}
