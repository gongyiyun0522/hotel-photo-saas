import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET(req: NextRequest) {
  const falKey = process.env.FAL_KEY;
  const id = req.nextUrl.searchParams.get("id");
  const model = req.nextUrl.searchParams.get("model");

  if (!falKey || !id || !model) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  fal.config({ credentials: falKey });

  try {
    const statusRes = await fal.queue.status(model, {
      requestId: id,
      logs: false,
    });

    if (statusRes.status === "COMPLETED") {
      // 直接从 response_url 获取结果
      const response = await fetch(statusRes.response_url, {
        headers: {
          Authorization: `Key ${falKey}`,
        },
      });
      const result = await response.json();
      
      // 检查是否有错误
      if (result.detail) {
        return NextResponse.json({ 
          status: "failed", 
          error: `处理失败: ${result.detail[0]?.msg || "未知错误"}` 
        });
      }
      
      // 获取输出图片 URL
      let outputUrl = "";
      if (result.image?.url) {
        outputUrl = result.image.url;
      } else if (result.images?.[0]?.url) {
        outputUrl = result.images[0].url;
      }
      
      if (!outputUrl) {
        return NextResponse.json({ 
          status: "failed", 
          error: "未找到输出图片" 
        });
      }
      
      return NextResponse.json({ status: "succeeded", output: outputUrl });
    }

    // 检查是否失败
    const isFailed = (statusRes.status as string) === "FAILED";
    if (isFailed) {
      return NextResponse.json({ status: "failed", error: "fal.ai 处理失败" });
    }

    // IN_QUEUE or IN_PROGRESS
    return NextResponse.json({ status: "processing" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "查询失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
