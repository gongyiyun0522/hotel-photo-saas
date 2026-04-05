"use client";
import { useState, useRef } from "react";

const FUNCTIONS = [
  {
    id: "enhance",
    title: "画质增强",
    desc: "AI超分辨率 · 自动美化 · 细节锐化 · 保持原貌",
    icon: "🔍",
  },
  {
    id: "refine",
    title: "智能美化",
    desc: "AI自动优化 · 提升质感 · 保持构图 · 微调画质",
    icon: "✨",
  },
  {
    id: "sunshine",
    title: "亮度美化", 
    desc: "AI智能调光 · 自然增亮 · 保持色彩 · 原图基础",
    icon: "☀️",
  },
  {
    id: "blue_night",
    title: "质感美化",
    desc: "AI质感提升 · 细节增强 · 保持风格 · 原图优化",
    icon: "🌆",
  },
];

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [mode, setMode] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [sliderX, setSliderX] = useState(50);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<File | null>(null);
  const modelRef = useRef<string>("");

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      alert("请上传 JPG 或 PNG 格式的图片");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("图片大小不能超过 20MB");
      return;
    }
    fileRef.current = file;
    setFileName(file.name);
    setResult("");
    setStatus("idle");
    setErrMsg("");
    const dataUrl = await readFileAsDataURL(file);
    setPreviewSrc(dataUrl);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function poll(id: string, model: string) {
    const maxAttempts = 40;
    let attempts = 0;
    return new Promise<void>((resolve, reject) => {
      const timer = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`/api/poll?id=${id}&model=${encodeURIComponent(model)}`);
          const data = await res.json();
          if (data.status === "succeeded") {
            clearInterval(timer);
            setResult(data.output);
            setStatus("done");
            resolve();
          } else if (data.status === "failed" || data.error) {
            clearInterval(timer);
            setErrMsg(data.error || "处理失败，请重试");
            setStatus("error");
            reject(new Error(data.error));
          } else if (attempts >= maxAttempts) {
            clearInterval(timer);
            setErrMsg("处理超时，请重试");
            setStatus("error");
            reject(new Error("timeout"));
          }
        } catch {
          // network error, keep polling
        }
      }, 3000);
    });
  }

  async function handleProcess() {
    if (!mode || !fileRef.current) return;
    setStatus("uploading");
    setErrMsg("");
    const form = new FormData();
    form.append("image", fileRef.current);
    form.append("mode", mode);
    try {
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      modelRef.current = data.model;
      setStatus("processing");
      await poll(data.id, data.model);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "请求失败");
      setStatus("error");
    }
  }

  function handleDownload() {
    if (!result) return;
    window.open(result, "_blank");
  }

  const canProcess = !!mode && !!previewSrc && status !== "uploading" && status !== "processing";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🏨</span>
        <div>
          <h1 className="text-lg font-semibold">酒店图片 AI 精修</h1>
          <p className="text-xs text-gray-400">专为酒店经营者打造的一键图片处理工具 · 输出：≥800×600px · JPG格式 · &lt;20MB</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Step 1 */}
        <section>
          <p className="text-sm text-gray-400 mb-3">① 选择处理功能</p>
          <div className="grid grid-cols-2 gap-4">            {FUNCTIONS.map((fn) => (
              <button
                key={fn.id}
                type="button"
                onClick={() => setMode(fn.id)}
                className={`rounded-xl border p-5 text-left transition-all ${
                  mode === fn.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-2">{fn.icon}</div>
                <div className="font-medium">{fn.title}</div>
                <div className="text-xs text-gray-400 mt-1">{fn.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2 — label+htmlFor 原生关联，无需JS触发 */}
        <section>
          <p className="text-sm text-gray-400 mb-3">② 上传照片</p>

          {/* input 放在 label 外，用 htmlFor 关联 */}
          <input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/png"
            onChange={onInputChange}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
          />

          <label
            htmlFor="photo-upload"
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{ display: "block", cursor: "pointer" }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragOver ? "border-amber-400 bg-amber-400/5" : "border-gray-700 hover:border-gray-500"
            }`}
          >
            {previewSrc ? (
              <div>
                <img
                  src={previewSrc}
                  alt="preview"
                  className="max-h-56 mx-auto rounded-lg object-contain mb-2"
                />
                <p className="text-xs text-gray-400">{fileName} · 点击重新选择</p>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <div className="text-5xl">📷</div>
                <p className="text-gray-300">点击选择图片，或拖拽到此处</p>
                <p className="text-gray-500 text-sm">支持 JPG / PNG，最大 20MB</p>
              </div>
            )}
          </label>
        </section>

        {/* Step 3 */}
        <section>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!canProcess}
            className="w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-400 text-gray-950 hover:bg-amber-300"
          >
            {status === "uploading" ? "上传中..." :
             status === "processing" ? "⏳ AI 处理中（约 30-90 秒）..." :
             "开始处理"}
          </button>
          {status === "error" && errMsg && (
            <p className="text-red-400 text-sm mt-2 text-center">❌ {errMsg}</p>
          )}
          {status === "processing" && (
            <p className="text-gray-500 text-xs mt-2 text-center">请不要关闭页面，正在调用 AI 模型...</p>
          )}
        </section>

        {/* Step 4 */}
        {status === "done" && result && (
          <section>
            <p className="text-sm text-gray-400 mb-3">③ 处理结果（拖动滑块对比）</p>
            <div
              className="relative rounded-xl overflow-hidden bg-gray-900 select-none"
              style={{ height: 420 }}
            >
              <img src={result} alt="result" className="absolute inset-0 w-full h-full object-contain" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderX}%` }}>
                <img
                  src={previewSrc}
                  alt="original"
                  className="absolute inset-0 h-full object-contain"
                  style={{ width: `${100 * 100 / sliderX}%`, maxWidth: "none" }}
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white/80 shadow-xl pointer-events-none"
                style={{ left: `calc(${sliderX}% - 2px)` }}
              />
              <input
                type="range" min={1} max={99} value={sliderX}
                onChange={(e) => setSliderX(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              />
              <span className="absolute top-3 left-3 text-xs bg-black/70 px-2 py-1 rounded">原图</span>
              <span className="absolute top-3 right-3 text-xs bg-amber-400/90 text-gray-950 px-2 py-1 rounded font-medium">AI 精修</span>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-4 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              ⬇️ 在新标签页打开结果图（右键另存为）
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
