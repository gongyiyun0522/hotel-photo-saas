import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const falKey = req.headers.get("x-fal-key") || process.env.FAL_KEY;
  const id = req.nextUrl.searchParams.get("id");
  const model = req.nextUrl.searchParams.get("model");

  if (!falKey || !id || !model) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // 直接调用 fal.ai REST API 获取状态
    const statusResponse = await fetch(
      `https://queue.fal.run/${model}/requests/${id}/status`,
      {
        headers: {
          "Authorization": `Key ${falKey}`,
        },
      }
    );

    const statusResult = await statusResponse.json() as {
      status: string;
      response_url?: string;
    };

    if (statusResult.status === "COMPLETED") {
      // 获取结果
      const resultResponse = await fetch(
        `https://queue.fal.run/${model}/requests/${id}`,
        {
          headers: {
            "Authorization": `Key ${falKey}`,
          },
        }
      );

      const result = await resultResponse.json() as Record<string, unknown>;

      if (result.detail) {
        const errorMsg = Array.isArray(result.detail)
          ? result.detail[0]?.msg
          : result.detail;
        return NextResponse.json({
          status: "failed",
          error: `处理失败: ${errorMsg}`,
        });
      }

      let outputUrl = "";
      if ((result as { image?: { url: string } }).image?.url) {
        outputUrl = (result as { image: { url: string } }).image.url;
      } else if ((result as { images?: Array<{ url: string }> }).images?.[0]?.url) {
        outputUrl = (result as { images: Array<{ url: string }> }).images[0].url;
      }

      if (!outputUrl) {
        return NextResponse.json({
          status: "failed",
          error: "未找到输出图片",
        });
      }

      return NextResponse.json({ status: "succeeded", output: outputUrl });
    }

    if (statusResult.status === "FAILED") {
      return NextResponse.json({
        status: "failed",
        error: "fal.ai 处理失败",
      });
    }

    // IN_QUEUE or IN_PROGRESS
    return NextResponse.json({ status: "processing" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "查询失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
