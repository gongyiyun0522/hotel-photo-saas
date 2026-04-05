import { NextRequest, NextResponse } from "next/server";

// fal.ai 模式配置 - 纯美化模式
const MODES: Record<string, { model: string }> = {
  enhance: { model: "fal-ai/creative-upscaler" },
  refine: { model: "fal-ai/creative-upscaler" },
  sunshine: { model: "fal-ai/creative-upscaler" },
  blue_night: { model: "fal-ai/creative-upscaler" },
};

export async function POST(req: NextRequest) {
  const falKey = req.headers.get("x-fal-key") || process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "Missing FAL_KEY" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File;
  const mode = formData.get("mode") as string;

  if (!file || !mode || !MODES[mode]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "图片大小不能超过 20MB" }, { status: 400 });
  }

  // 转换为 base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const model = MODES[mode].model;

  try {
    // 直接调用 fal.ai REST API，不使用 SDK
    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          image_url: dataUrl,
          scale: 2,
          output_format: "jpeg",
        },
      }),
    });

    const result = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg = result.detail 
        ? (Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail) 
        : "fal.ai API error";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    return NextResponse.json({
      id: (result as { request_id: string }).request_id,
      model: model,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "fal.ai 提交失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
