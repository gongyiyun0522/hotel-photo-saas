import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// fal.ai 模式配置 - 纯美化模式
const MODES: Record<string, { model: string; type: "upscale" | "enhance"; prompt?: string }> = {
  // 清晰度增强：fal creative-upscaler
  enhance: {
    model: "fal-ai/creative-upscaler",
    type: "upscale",
  },
  // 客房美化：同样用 creative-upscaler（它会自动美化）
  refine: {
    model: "fal-ai/creative-upscaler", 
    type: "enhance",
  },
  // 阳光美化：creative-upscaler
  sunshine: {
    model: "fal-ai/creative-upscaler",
    type: "enhance",
  },
  // 夜景美化：creative-upscaler
  blue_night: {
    model: "fal-ai/creative-upscaler",
    type: "enhance",
  },
};

export async function POST(req: NextRequest) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "Missing FAL_KEY" }, { status: 500 });
  }

  fal.config({ credentials: falKey });

  const formData = await req.formData();
  const file = formData.get("image") as File;
  const mode = formData.get("mode") as string;

  if (!file || !mode || !MODES[mode]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 检查文件大小 (20MB 限制)
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "图片大小不能超过 20MB" }, { status: 400 });
  }

  // 转换为 base64 data URL
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const cfg = MODES[mode];

  try {
    let input: Record<string, unknown>;

    // 所有功能都用 creative-upscaler 的图片美化能力
    if (cfg.type === "upscale" || cfg.type === "enhance") {
      input = { 
        image_url: dataUrl,
        scale: 2, // 2x 超分辨率同时会自动美化
        output_format: "jpeg", // JPG 格式
      };
    } else {
      // fallback 默认配置
      input = {
        image_url: dataUrl,
        scale: 2,
        output_format: "jpeg",
      };
    }

    // 异步提交，返回 requestId 给前端轮询
    const { request_id } = await fal.queue.submit(cfg.model, { input });

    return NextResponse.json({ id: request_id, model: cfg.model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "fal.ai 提交失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
