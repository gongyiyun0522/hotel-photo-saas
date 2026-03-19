import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  refine:
    "professional hotel room photography, smooth bedding, clean interior, warm lighting, no clutter, balanced exposure, high quality",
  sunshine:
    "bright sunlight streaming through window, warm golden light, natural sunshine atmosphere, hotel room, cozy and bright",
};

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File;
  const mode = formData.get("mode") as string;

  if (!file || !mode || !PROMPTS[mode]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Convert file to base64 data URL
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const prompt = PROMPTS[mode];

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "d41bcb10d8c159868f4cfbd7c6a2ca01484f7d39e4613419d5952c61562f1ba7",
      input: {
        image: dataUrl,
        prompt,
        num_inference_steps: 28,
        guidance_scale: 5,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const prediction = await response.json();
  return NextResponse.json({ id: prediction.id, status: prediction.status });
}
