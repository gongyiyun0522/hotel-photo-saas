"use client";
import { useState, useRef, useCallback } from "react";

const FUNCTIONS = [
  {
    id: "refine",
    title: "客房一键精修",
    desc: "智能打光 · 光滑床品 · 去除杂物 · 统一色温 · 降低过曝",
    icon: "✨",
  },
  {
    id: "sunshine",
    title: "一键阳光",
    desc: "增加阳光光束 · 温暖光影氛围 · 提升亮度层次",
    icon: "☀️",
  },
];

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [mode, setMode] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [sliderX, setSliderX] = useState(50);
  const fileRef = useRef<File | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setResult("");
    setStatus("idle");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const poll = async (id: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/poll?id=${id}`);
      const data = await res.json();
      if (data.status === "succeeded") {
        clearInterval(interval);
        const output = Array.isArray(data.output) ? data.output[0] : data.output;
        setResult(output);
        setStatus("done");
      } else if (data.status === "failed" || data.error) {
        clearInterval(interval);
        setErrMsg(data.error || "处理失败，请重试");
        setStatus("error");
      }
    }, 3000);
  };

  const handleProcess = async () => {
    if (!mode || !fileRef.current) return;
    setStatus("uploading");
    setErrMsg("");
    const form = new FormData();
    form.append("image", fileRef.current);
    form.append("mode", mode);
    try {
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("processing");
      await poll(data.id);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "请求失败");
      setStatus("error");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "hotel-photo-enhanced.jpg";
    a.click();
  };

  const canProcess = mode && preview && status !== "uploading" && status !== "processing";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🏨</span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">酒店图片 AI 精修</h1>
          <p className="text-xs text-gray-400">专为酒店经营者打造的一键图片处理工具</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Step 1: 选择功能 */}
        <section>
          <p className="text-sm text-gray-400 mb-3">① 选择处理功能</p>
          <div className="grid grid-cols-2 gap-4">
            {FUNCTIONS.map((fn) => (
              <button
                key={fn.id}
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

        {/* Step 2: 上传图片 */}
        <section>
          <p className="text-sm text-gray-400 mb-3">② 上传照片</p>
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">📷</div>
                <p className="text-gray-400 text-sm">拖拽图片到此处，或点击上传</p>
                <p className="text-gray-600 text-xs">支持 JPG / PNG，最大 10MB</p>
              </div>
            )}
            <input
              id="fileInput"
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </section>

        {/* Step 3: 处理按钮 */}
        <section>
          <button
            onClick={handleProcess}
            disabled={!canProcess}
            className="w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-400 text-gray-950 hover:bg-amber-300"
          >
            {status === "uploading" && "上传中..."}
            {status === "processing" && "AI 处理中，请稍候（约 30-90 秒）..."}
            {(status === "idle" || status === "done" || status === "error") && "开始处理"}
          </button>
          {status === "error" && (
            <p className="text-red-400 text-sm mt-2 text-center">{errMsg}</p>
          )}
        </section>

        {/* Step 4: 对比结果 */}
        {status === "done" && result && (
          <section>
            <p className="text-sm text-gray-400 mb-3">④ 处理结果对比</p>
            <div className="relative rounded-xl overflow-hidden select-none" style={{ height: 400 }}>
              <img src={preview} alt="original" className="absolute inset-0 w-full h-full object-contain bg-gray-900" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderX}%` }}
              >
                <img src={result} alt="result" className="absolute inset-0 w-full h-full object-contain bg-gray-900" style={{ width: `${10000 / sliderX}%`, maxWidth: "none" }} />
              </div>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                style={{ left: `${sliderX}%` }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={sliderX}
                onChange={(e) => setSliderX(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              />
              <span className="absolute top-3 left-3 text-xs bg-black/60 px-2 py-1 rounded">原图</span>
              <span className="absolute top-3 right-3 text-xs bg-amber-400/80 text-gray-950 px-2 py-1 rounded">AI 精修</span>
            </div>
            <button
              onClick={handleDownload}
              className="mt-4 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              ⬇️ 下载处理后的图片
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
