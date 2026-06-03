import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { VideoStateContext } from "../context/VideoStateContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const ANALYSIS_STEPS = [
  "Uploading video",
  "Checking frames",
  "Finding likely products",
];

const DEMO_VIDEOS = [
  {
    id: "fashion-demo",
    title: "Fashion Demo",
    duration: "01:24",
    lengthSec: 84,
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    detections: [
      {
        id: "fashion-1",
        name: "Nike Shoes",
        brand: "Nike",
        model: null,
        productType: "Sneakers",
        confidence: 0.96,
        category: "Fashion",
        timestampSec: 11,
        image:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        buyLink: "https://www.amazon.com/s?k=nike+shoes",
        externalLink: "https://www.nike.com/",
        exactSearchLink: "https://www.google.com/search?q=nike+shoes",
        googleShoppingLink: "https://www.google.com/search?tbm=shop&q=nike+shoes",
        brandLink: "https://www.nike.com/",
        searchQuery: "nike shoes",
        summary: "Sneaker-like product detected from the opening frames.",
      },
      {
        id: "fashion-2",
        name: "Gucci Bag",
        brand: "Gucci",
        model: null,
        productType: "Handbag",
        confidence: 0.91,
        category: "Luxury",
        timestampSec: 33,
        image:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
        buyLink: "https://www.amazon.com/s?k=designer+bag",
        externalLink: "https://www.gucci.com/",
        exactSearchLink: "https://www.google.com/search?q=gucci+bag",
        googleShoppingLink: "https://www.google.com/search?tbm=shop&q=gucci+bag",
        brandLink: "https://www.gucci.com/",
        searchQuery: "gucci bag",
        summary: "Bag-like luxury item found from side-angle frames.",
      },
    ],
  },
  {
    id: "tech-demo",
    title: "Tech Demo",
    duration: "03:08",
    lengthSec: 188,
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    detections: [
      {
        id: "tech-1",
        name: "MacBook Pro",
        brand: "Apple",
        model: "MacBook Pro",
        productType: "Laptop",
        confidence: 0.97,
        category: "Tech",
        timestampSec: 26,
        image:
          "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
        buyLink: "https://www.amazon.com/s?k=macbook+pro",
        externalLink: "https://www.apple.com/macbook-pro/",
        exactSearchLink: "https://www.google.com/search?q=apple+macbook+pro",
        googleShoppingLink: "https://www.google.com/search?tbm=shop&q=apple+macbook+pro",
        brandLink: "https://www.apple.com/macbook-pro/",
        searchQuery: "apple macbook pro",
        summary: "Laptop detected with a strong match to a MacBook-style profile.",
      },
      {
        id: "tech-2",
        name: "Apple Watch",
        brand: "Apple",
        model: null,
        productType: "Smartwatch",
        confidence: 0.92,
        category: "Tech",
        timestampSec: 67,
        image:
          "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=900&q=80",
        buyLink: "https://www.amazon.com/s?k=apple+watch",
        externalLink: "https://www.apple.com/watch/",
        exactSearchLink: "https://www.google.com/search?q=apple+watch",
        googleShoppingLink: "https://www.google.com/search?tbm=shop&q=apple+watch",
        brandLink: "https://www.apple.com/watch/",
        searchQuery: "apple watch",
        summary: "Watch-shaped wearable found in the middle section of the clip.",
      },
    ],
  },
];

const FALLBACK_DETECTIONS = [
  {
    id: "fallback-1",
    name: "Detected item",
    brand: null,
    model: null,
    productType: "Product",
    confidence: 0.72,
    category: "Lifestyle",
    timestampSec: 12,
    image: "",
    buyLink: "https://www.google.com/search?tbm=shop&q=product",
    externalLink: "https://www.google.com/search?q=product",
    exactSearchLink: "https://www.google.com/search?q=product",
    googleShoppingLink: "https://www.google.com/search?tbm=shop&q=product",
    brandLink: "https://www.google.com/search?q=product+brand",
    searchQuery: "product",
    summary: "The AI service was unavailable, so this is a placeholder result.",
  },
];

function buildGoogleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(String(query || "").trim())}`;
}

function buildGoogleShoppingUrl(query) {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(String(query || "").trim())}`;
}

function formatTimestamp(seconds) {
  const mins = Math.floor(Number(seconds || 0) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(Number(seconds || 0) % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function uniqStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    const key = text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSearchHints(item) {
  const baseHints = Array.isArray(item?.searchHints) ? item.searchHints : [];
  const generated = [];
  const name = String(item?.name || "").trim();
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const type = String(item?.productType || "").trim();
  const category = String(item?.category || "").trim().toLowerCase();

  if (brand && model && type) generated.push(`${brand} ${model} ${type}`);
  if (brand && type) generated.push(`${brand} ${type}`);
  if (name) generated.push(name);

  if (category === "tech") {
    if (brand) generated.push(`${brand} phone back design`);
    if (brand) generated.push(`${brand} sharp edges 3 cameras`);
    if (type) generated.push(`${type} camera layout`);
  } else if (category === "fashion") {
    if (brand) generated.push(`${brand} ${type} side view`);
    if (type) generated.push(`${type} material close up`);
  } else {
    if (type) generated.push(`${type} from video`);
    if (name) generated.push(`${name} close up`);
  }

  return uniqStrings([...baseHints, ...generated]).slice(0, 4);
}

function normalizeDetection(item) {
  const name = String(item?.name || "Detected item").trim();
  const brand = item?.brand ? String(item.brand).trim() : "";
  const model = item?.model ? String(item.model).trim() : "";
  const productType = String(item?.productType || name).trim();
  const query =
    String(item?.searchQuery || [brand, model, productType].filter(Boolean).join(" ") || name).trim();
  const searchHints = buildSearchHints(item);
  const hintedQuery = searchHints[0] || query;

  return {
    ...item,
    name,
    brand: brand || null,
    model: model || null,
    productType,
    searchQuery: query,
    exactSearchLink: item?.exactSearchLink || buildGoogleSearchUrl(query),
    googleShoppingLink: item?.googleShoppingLink || buildGoogleShoppingUrl(query),
    brandLink: item?.brandLink || (brand ? buildGoogleSearchUrl(brand) : buildGoogleSearchUrl(query)),
    buyLink: item?.buyLink || buildGoogleShoppingUrl(query),
    externalLink: item?.externalLink || buildGoogleSearchUrl(query),
    hintedSearchLink: buildGoogleSearchUrl(hintedQuery),
    searchHints,
  };
}

function createFallbackThumbnail(label) {
  const safeLabel = String(label || "Detected item")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <rect width="320" height="220" fill="#f5f5f4"/>
      <rect x="24" y="24" width="272" height="172" rx="14" fill="#e7e5e4"/>
      <text x="160" y="104" text-anchor="middle" fill="#44403c" font-size="18" font-family="Arial, sans-serif">
        No preview
      </text>
      <text x="160" y="134" text-anchor="middle" fill="#57534e" font-size="14" font-family="Arial, sans-serif">
        ${safeLabel}
      </text>
    </svg>`
  )}`;
}

function Panel({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-stone-300 bg-white p-5">
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function ActionLink({ href, children, primary = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        primary
          ? "rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white"
          : "rounded-lg border border-stone-300 px-4 py-2 text-center text-sm text-stone-700"
      }
    >
      {children}
    </a>
  );
}

function DetectionListItem({ item, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 px-3 py-3 text-left transition ${
        isSelected ? "border-slate-900 bg-stone-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex gap-3">
        <img
          src={item.image || createFallbackThumbnail(item.name)}
          alt={item.name}
          className="h-16 w-16 rounded-lg border border-stone-200 object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = createFallbackThumbnail(item.name);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-stone-500">{item.category}</p>
            </div>
            <span className="text-xs text-stone-500">{Math.round(item.confidence * 100)}%</span>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {item.brand || "Brand not confirmed"} {item.model ? `- ${item.model}` : ""}
          </p>
          <p className="mt-1 text-xs text-stone-500">Seen at {formatTimestamp(item.timestampSec)}</p>
        </div>
      </div>
    </button>
  );
}

export default function ShoppableExperience({ initialMode = "home" }) {
  const { selectedFile, videoUrl, setSelectedFile } = useContext(VideoStateContext);
  const fileInputRef = useRef(null);
  const [activeDemoId, setActiveDemoId] = useState(DEMO_VIDEOS[0].id);
  const [activeSource, setActiveSource] = useState(initialMode === "upload" ? "upload" : "demo");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(initialMode !== "upload");
  const [uploadError, setUploadError] = useState("");
  const [uploadedResult, setUploadedResult] = useState(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);

  const activeDemo = useMemo(
    () => DEMO_VIDEOS.find((video) => video.id === activeDemoId) || DEMO_VIDEOS[0],
    [activeDemoId]
  );

  useEffect(() => {
    if (initialMode === "watch") {
      setActiveSource("demo");
      setAnalysisComplete(true);
      setSelectedDetectionId(null);
      return;
    }
    if (initialMode === "upload") {
      setActiveSource("upload");
      setAnalysisComplete(false);
    }
  }, [initialMode]);

  useEffect(() => {
    if (!isAnalyzing) return undefined;
    const timer = window.setInterval(() => {
      setAnalysisStepIndex((current) => (current + 1) % ANALYSIS_STEPS.length);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  useEffect(() => {
    if (!videoUrl || !selectedFile) return undefined;

    let cancelled = false;
    setActiveSource("upload");
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setAnalysisStepIndex(0);
    setUploadError("");

    const runAnalysis = async () => {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const submitRes = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: "POST",
          body: formData,
        });
        if (!submitRes.ok) {
          throw new Error(`Upload failed (${submitRes.status})`);
        }

        const submitPayload = await submitRes.json();
        const jobId = submitPayload?.jobId;
        if (!jobId) {
          throw new Error("No job id returned from AI service");
        }

        let completed = false;
        for (let attempt = 0; attempt < 180; attempt += 1) {
          if (cancelled) return;
          await new Promise((resolve) => window.setTimeout(resolve, 1000));

          const statusRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
          if (!statusRes.ok) {
            throw new Error(`Status check failed (${statusRes.status})`);
          }

          const statusPayload = await statusRes.json();
          if (statusPayload.status === "failed") {
            throw new Error(statusPayload.error || "AI analysis job failed");
          }
          if (statusPayload.status === "completed") {
            completed = true;
            break;
          }
        }

        if (!completed) {
          throw new Error("AI analysis timed out");
        }

        const resultRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/result`);
        if (!resultRes.ok) {
          throw new Error(`Failed to fetch AI result (${resultRes.status})`);
        }

        const resultPayload = await resultRes.json();
        if (cancelled) return;

        setUploadedResult({
          id: "uploaded-video",
          title: selectedFile.name,
          duration: resultPayload?.duration || "Custom",
          lengthSec: resultPayload?.lengthSec || 140,
          videoUrl,
          detections: Array.isArray(resultPayload?.detections) ? resultPayload.detections : FALLBACK_DETECTIONS,
        });
      } catch (error) {
        if (cancelled) return;
        setUploadError("Live AI service unavailable. Showing a simple fallback result.");
        setUploadedResult({
          id: "uploaded-video",
          title: selectedFile?.name || "Uploaded video",
          duration: "Custom",
          lengthSec: 140,
          videoUrl,
          detections: FALLBACK_DETECTIONS,
        });
      } finally {
        if (cancelled) return;
        setIsAnalyzing(false);
        setAnalysisComplete(true);
        setSelectedDetectionId(null);
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [selectedFile, videoUrl]);

  const activeVideo = activeSource === "upload" ? uploadedResult : activeDemo;
  const activeVideoUrl = activeSource === "upload" ? videoUrl || activeVideo?.videoUrl : activeVideo?.videoUrl;

  const visibleDetections = useMemo(() => {
    const detections = activeVideo?.detections?.length ? activeVideo.detections : FALLBACK_DETECTIONS;
    return detections.map(normalizeDetection);
  }, [activeVideo]);

  useEffect(() => {
    if (!visibleDetections.length) {
      setSelectedDetectionId(null);
      return;
    }
    if (!selectedDetectionId || !visibleDetections.some((item) => item.id === selectedDetectionId)) {
      setSelectedDetectionId(visibleDetections[0].id);
    }
  }, [visibleDetections, selectedDetectionId]);

  const selectedDetection = useMemo(
    () => visibleDetections.find((item) => item.id === selectedDetectionId) || visibleDetections[0] || null,
    [visibleDetections, selectedDetectionId]
  );

  const handleFilePick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setUploadError("Please choose a video file.");
      return;
    }
    setUploadError("");
    setSelectedFile(file);
    event.target.value = "";
  };

  const resetToDemo = () => {
    setActiveSource("demo");
    setAnalysisComplete(true);
    setUploadError("");
    setSelectedDetectionId(null);
  };

  const analysisTitle = isAnalyzing
    ? ANALYSIS_STEPS[analysisStepIndex]
    : analysisComplete
      ? "Analysis ready"
      : "Waiting for video";

  const analysisText = isAnalyzing
    ? "This can take a little time for uploads."
    : analysisComplete
      ? "Review the detected items and open the search links."
      : "Upload a file or choose a demo to see results.";

  const pageIntro =
    initialMode === "upload"
      ? {
          eyebrow: "Upload Workspace",
          title: "Upload a video and review detected items",
          text: "Choose your own video file, wait for the AI analysis, then open search links for the products it finds.",
        }
      : initialMode === "watch"
        ? {
            eyebrow: "Demo Workspace",
            title: "Try the project with built-in demo videos",
            text: "Use the demos to understand the experience quickly, then switch to uploads whenever you want to test your own file.",
          }
        : {
            eyebrow: "MachineVision",
            title: "Shop items from a video",
            text: "Upload a clip or use a demo to detect products and explore search links.",
          };

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFilePick}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-500">{pageIntro.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold">{pageIntro.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{pageIntro.text}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a href="/" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-700">
              Home
            </a>
            <a href="/upload" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-700">
              Upload
            </a>
            <a href="/watch" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-700">
              Demo
            </a>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-5">
            <Panel title="Choose video">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Upload video
                </button>
                <button
                  type="button"
                  onClick={resetToDemo}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700"
                >
                  Use demo videos
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DEMO_VIDEOS.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => {
                      setActiveDemoId(video.id);
                      resetToDemo();
                    }}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      activeDemoId === video.id && activeSource === "demo"
                        ? "border-slate-900 bg-stone-50"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{video.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{video.duration}</p>
                  </button>
                ))}
              </div>

              {selectedFile ? (
                <p className="mt-4 text-sm text-stone-600">Selected file: {selectedFile.name}</p>
              ) : null}
              {uploadError ? <p className="mt-2 text-sm text-amber-700">{uploadError}</p> : null}
            </Panel>

            <Panel
              title={activeVideo?.title || "Video preview"}
              action={
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                  {activeVideo?.duration || "00:00"}
                </span>
              }
            >
              <p className="mb-3 text-sm text-stone-500">
                Source: {activeSource === "upload" ? "Uploaded video" : "Demo video"}
              </p>

              <div className="overflow-hidden rounded-xl border border-stone-200 bg-black">
                {activeVideoUrl ? (
                  <video src={activeVideoUrl} controls className="aspect-video w-full bg-black" />
                ) : (
                  <div className="flex aspect-video items-center justify-center px-6 text-sm text-stone-400">
                    Upload a video or pick a demo to start.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{analysisTitle}</p>
                <p className="mt-1 text-sm text-stone-600">{analysisText}</p>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Detected items">
              <div className="space-y-3">
                {visibleDetections.map((item) => (
                  <DetectionListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedDetection?.id === item.id}
                    onSelect={() => setSelectedDetectionId(item.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Selected item">
              {selectedDetection ? (
                <>
                  <p className="text-sm leading-6 text-stone-700">{selectedDetection.summary}</p>

                  <div className="mt-4 space-y-2 text-sm text-stone-600">
                    <p>Name: {selectedDetection.name}</p>
                    <p>Type: {selectedDetection.productType}</p>
                    <p>Brand: {selectedDetection.brand || "Not confirmed"}</p>
                    <p>Model: {selectedDetection.model || "Not confirmed"}</p>
                    <p>Search query: {selectedDetection.searchQuery}</p>
                    <p>Seen at: {formatTimestamp(selectedDetection.timestampSec)}</p>
                  </div>

                  {selectedDetection.searchHints?.length ? (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-900">Search hints</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedDetection.searchHints.map((hint) => (
                          <a
                            key={hint}
                            href={buildGoogleSearchUrl(hint)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-xs text-stone-700"
                          >
                            {hint}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <ActionLink href={selectedDetection.hintedSearchLink} primary>
                      Hint-based search
                    </ActionLink>
                    <ActionLink href={selectedDetection.exactSearchLink}>Exact search</ActionLink>
                    <ActionLink href={selectedDetection.googleShoppingLink}>Google Shopping</ActionLink>
                    <ActionLink href={selectedDetection.brandLink}>Brand link</ActionLink>
                    <ActionLink href={selectedDetection.buyLink}>Buy link</ActionLink>
                    <ActionLink href={selectedDetection.externalLink}>Open result</ActionLink>
                  </div>
                </>
              ) : (
                <p className="text-sm text-stone-600">No result selected yet.</p>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
