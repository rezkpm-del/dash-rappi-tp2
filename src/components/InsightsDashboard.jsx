import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Send,
  FileDown,
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  Activity,
  Terminal,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";

const WEBHOOK_URL =
  "https://pablin.app.n8n.cloud/webhook/fb131240-08bf-43b6-9c85-d26846596060";

// ---------- Helpers ----------

/**
 * Parses markdown text and separates it into segments:
 *   { type: "markdown", content: string }
 *   { type: "chart", chart: {...}, id: string }
 *
 * Detects ```json ... ``` blocks that contain a "chart" key.
 */
function parseResponse(raw) {
  if (!raw || typeof raw !== "string") return [];

  const segments = [];
  // Match ```json ... ``` blocks (case-insensitive, non-greedy, multi-line)
  const regex = /```json\s*([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match;
  let chartCounter = 0;

  while ((match = regex.exec(raw)) !== null) {
    // Text before this code block
    const before = raw.slice(lastIndex, match.index);
    if (before.trim().length > 0) {
      segments.push({ type: "markdown", content: before });
    }

    // Try to parse the JSON
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.chart && Array.isArray(parsed.chart.data)) {
        segments.push({
          type: "chart",
          chart: parsed.chart,
          id: `chart-${chartCounter++}`,
        });
      } else {
        // JSON but not a chart payload — render as a code block fallback
        segments.push({
          type: "markdown",
          content: "```json\n" + jsonStr + "\n```",
        });
      }
    } catch (e) {
      // Invalid JSON — keep it as a code block so user sees something
      segments.push({
        type: "markdown",
        content: "```json\n" + jsonStr + "\n```",
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  const tail = raw.slice(lastIndex);
  if (tail.trim().length > 0) {
    segments.push({ type: "markdown", content: tail });
  }

  return segments;
}

/**
 * Extract a clean string from arbitrary webhook response shapes.
 * n8n often returns: a string, { output: "..." }, { text: "..." },
 * { message: "..." }, or an array of those.
 */
function extractText(data) {
  if (data == null) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    return data.map(extractText).filter(Boolean).join("\n\n");
  }
  if (typeof data === "object") {
    const candidates = [
      "output",
      "text",
      "message",
      "response",
      "reply",
      "content",
      "answer",
      "result",
    ];
    for (const key of candidates) {
      if (typeof data[key] === "string" && data[key].length > 0) {
        return data[key];
      }
    }
    // Fall back to JSON dump so the user still sees something
    try {
      return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
    } catch {
      return String(data);
    }
  }
  return String(data);
}

// CSV escaping per RFC 4180
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------- Chart Component ----------

const CHART_COLOR = "#7C5CFF"; // violet-electric primary
const CHART_COLOR_2 = "#22D3EE"; // cyan accent

function ChartBlock({ chart }) {
  const { type, title, data } = chart;
  const isLine = type === "line";

  return (
    <div className="my-6 rounded-lg border border-neutral-800 bg-neutral-950/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-violet-400" strokeWidth={2.5} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-mono">
            {isLine ? "Line · Series" : "Bar · Series"}
          </span>
        </div>
        <span className="text-[10px] text-neutral-600 font-mono">
          n={data.length}
        </span>
      </div>

      <div className="px-5 pt-5 pb-2">
        <h3 className="text-sm font-medium text-neutral-100 tracking-tight">
          {title || "Untitled chart"}
        </h3>
      </div>

      <div className="px-3 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          {isLine ? (
            <LineChart
              data={data}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="#262626"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#737373", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                axisLine={{ stroke: "#262626" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#737373", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #404040",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                }}
                labelStyle={{ color: "#a3a3a3", marginBottom: 4 }}
                itemStyle={{ color: "#e5e5e5" }}
                cursor={{ stroke: CHART_COLOR, strokeOpacity: 0.3, strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLOR}
                strokeWidth={2}
                dot={{ fill: CHART_COLOR, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLOR, stroke: "#0a0a0a", strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={1} />
                  <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="#262626"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#737373", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                axisLine={{ stroke: "#262626" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#737373", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #404040",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                }}
                labelStyle={{ color: "#a3a3a3", marginBottom: 4 }}
                itemStyle={{ color: "#e5e5e5" }}
                cursor={{ fill: CHART_COLOR, fillOpacity: 0.08 }}
              />
              <Bar
                dataKey="value"
                fill="url(#barFill)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------- Markdown styling ----------

const mdComponents = {
  h1: (p) => (
    <h1
      className="text-2xl font-semibold tracking-tight text-neutral-50 mt-8 mb-4 first:mt-0"
      {...p}
    />
  ),
  h2: (p) => (
    <h2
      className="text-lg font-semibold tracking-tight text-neutral-100 mt-6 mb-3 flex items-baseline gap-2 first:mt-0"
      {...p}
    />
  ),
  h3: (p) => (
    <h3
      className="text-base font-semibold text-neutral-200 mt-5 mb-2"
      {...p}
    />
  ),
  p: (p) => (
    <p className="text-[14.5px] leading-relaxed text-neutral-300 mb-3" {...p} />
  ),
  ul: (p) => <ul className="space-y-1.5 mb-4 ml-1" {...p} />,
  ol: (p) => (
    <ol className="space-y-1.5 mb-4 ml-1 list-decimal list-inside" {...p} />
  ),
  li: ({ children, ...rest }) => (
    <li
      className="text-[14.5px] leading-relaxed text-neutral-300 pl-4 relative before:content-['›'] before:absolute before:left-0 before:text-violet-400 before:font-mono"
      {...rest}
    >
      {children}
    </li>
  ),
  strong: (p) => (
    <strong className="font-semibold text-neutral-50" {...p} />
  ),
  em: (p) => <em className="italic text-neutral-200" {...p} />,
  code: ({ inline, children, ...rest }) =>
    inline ? (
      <code
        className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-violet-300 font-mono text-[12.5px] border border-neutral-700/60"
        {...rest}
      >
        {children}
      </code>
    ) : (
      <code className="block font-mono text-[12.5px]" {...rest}>
        {children}
      </code>
    ),
  pre: (p) => (
    <pre
      className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 overflow-x-auto text-neutral-300 text-[12.5px] font-mono mb-4"
      {...p}
    />
  ),
  blockquote: (p) => (
    <blockquote
      className="border-l-2 border-violet-500 pl-4 my-4 text-neutral-400 italic"
      {...p}
    />
  ),
  table: (p) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-neutral-800">
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-neutral-900/60" {...p} />,
  th: (p) => (
    <th
      className="px-3 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800"
      {...p}
    />
  ),
  td: (p) => (
    <td className="px-3 py-2 text-neutral-300 border-b border-neutral-900" {...p} />
  ),
  a: (p) => (
    <a
      className="text-violet-400 underline decoration-violet-700 underline-offset-2 hover:text-violet-300"
      target="_blank"
      rel="noreferrer noopener"
      {...p}
    />
  ),
  hr: () => <hr className="my-6 border-neutral-800" />,
};

// ---------- Skeleton loader ----------

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
        <span className="text-[11px] font-mono uppercase tracking-[0.18em]">
          Analyzing · Generating insights
        </span>
      </div>
      <div className="h-5 bg-neutral-900 rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-neutral-900 rounded w-full" />
        <div className="h-3 bg-neutral-900 rounded w-[92%]" />
        <div className="h-3 bg-neutral-900 rounded w-[78%]" />
      </div>
      <div className="h-48 bg-neutral-900/70 rounded-lg border border-neutral-800/60" />
      <div className="space-y-2">
        <div className="h-3 bg-neutral-900 rounded w-[88%]" />
        <div className="h-3 bg-neutral-900 rounded w-[65%]" />
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function InsightsDashboard() {
  const [question, setQuestion] = useState("");
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);
  const textareaRef = useRef(null);

  // Speech recognition
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setSpeechSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        baseTextRef.current = (baseTextRef.current + " " + finalText).trim() + " ";
      }
      setQuestion((baseTextRef.current + interim).trimStart());
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = (e) => {
      console.error("SpeechRecognition error", e);
      setIsListening(false);
    };
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
    };
  }, []);

  function toggleListening() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      try { rec.stop(); } catch {}
      setIsListening(false);
    } else {
      baseTextRef.current = question ? question.trimEnd() + " " : "";
      try {
        rec.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [question]);

  // PDF export uses native window.print() — see @media print in styles.css

  async function handleSubmit() {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    setSegments([]);
    setLastQuestion(q);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      // Try JSON first, fall back to text
      const contentType = res.headers.get("content-type") || "";
      let payload;
      if (contentType.includes("application/json")) {
        payload = await res.json();
      } else {
        payload = await res.text();
      }

      const text = extractText(payload);
      const parsed = parseResponse(text);
      setSegments(parsed);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function exportPDF() {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      // Native browser print — user picks "Save as PDF" in the dialog.
      // All styling is handled by @media print rules in styles.css.
      window.print();
    } finally {
      // Reset immediately; print dialog is modal and synchronous-ish.
      setTimeout(() => setExporting(false), 300);
    }
  }

  function exportCSV() {
    const charts = segments.filter((s) => s.type === "chart");
    if (charts.length === 0) return;

    const lines = [];
    charts.forEach((seg, idx) => {
      const { title, type, data } = seg.chart;
      if (idx > 0) lines.push(""); // blank line between charts
      lines.push(`# ${title || "Chart " + (idx + 1)} (${type})`);
      lines.push("name,value");
      data.forEach((row) => {
        lines.push(`${csvEscape(row.name)},${csvEscape(row.value)}`);
      });
    });

    // BOM for Excel compatibility with UTF-8
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insights-data-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasReport = segments.length > 0;
  const chartCount = segments.filter((s) => s.type === "chart").length;
  const hasCharts = chartCount > 0;

  const samplePrompts = [
    "Analiza las ventas del último trimestre por región",
    "Muestra la evolución de conversiones de los últimos 6 meses",
    "Compara el performance de los productos top 5",
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(124,92,255,0.18), transparent 40%), radial-gradient(circle at 80% 100%, rgba(34,211,238,0.08), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-neutral-900/80 backdrop-blur-sm bg-neutral-950/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500 blur-md opacity-40" />
              <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center border border-violet-400/30">
                <Terminal className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500">
                Ops Intelligence
              </div>
              <div className="text-sm font-semibold tracking-tight text-neutral-50">
                Automated Insights System
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Agent online</span>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 pb-44">
          {/* Empty state */}
          {!hasReport && !loading && !error && (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-900/40 mb-6">
                <Sparkles className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                  AI-powered · Real-time analysis
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-50 mb-3">
                Ask your operations.
              </h1>
              <p className="text-neutral-400 max-w-lg mx-auto mb-10 leading-relaxed">
                Formula una pregunta en lenguaje natural y obtén reportes
                ejecutivos con visualizaciones generadas por el agente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(p)}
                    className="group text-left p-4 rounded-lg border border-neutral-800 bg-neutral-900/30 hover:border-violet-500/50 hover:bg-neutral-900/60 transition-all"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 group-hover:text-violet-400 mb-2 transition-colors">
                      Prompt {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="text-[13px] text-neutral-300 leading-snug">
                      {p}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8">
              <SkeletonLoader />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-red-200 mb-1">
                  Request failed
                </div>
                <div className="text-[13px] text-red-300/80 font-mono">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Report */}
          {hasReport && !loading && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-5 border-b border-neutral-900">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-1">
                    Query · {new Date().toLocaleString()}
                  </div>
                  <div className="text-sm text-neutral-300 truncate max-w-xl">
                    {lastQuestion}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={exportPDF}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-medium bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {exporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    onClick={exportCSV}
                    disabled={!hasCharts}
                    title={
                      hasCharts
                        ? `Exportar ${chartCount} dataset(s)`
                        : "No hay datos de gráficos para exportar"
                    }
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] font-medium bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/60 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 disabled:cursor-not-allowed transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Descargar CSV</span>
                    {hasCharts && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-700/60 text-[10px] font-mono">
                        {chartCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Report body — this is what gets exported to PDF */}
              <div
                ref={reportRef}
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 md:p-8"
                style={{ background: "#0a0a0a" }}
              >
                <div className="mb-6 pb-4 border-b border-neutral-800">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 mb-1">
                    Operations Report
                  </div>
                  <div className="text-base font-semibold text-neutral-100">
                    {lastQuestion}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 font-mono">
                    {new Date().toLocaleString()}
                  </div>
                </div>

                {segments.map((seg, i) =>
                  seg.type === "chart" ? (
                    <ChartBlock key={seg.id || i} chart={seg.chart} />
                  ) : (
                    <div key={i} className="prose-invert">
                      <ReactMarkdown components={mdComponents}>
                        {seg.content}
                      </ReactMarkdown>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom input bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-neutral-900 bg-neutral-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/60 focus-within:border-violet-500/60 focus-within:bg-neutral-900 transition-colors">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus operaciones... (⌘/Ctrl + Enter para enviar)"
              rows={1}
              disabled={loading}
              className="w-full bg-transparent text-[14px] text-neutral-100 placeholder-neutral-600 px-4 pt-3.5 pb-12 resize-none outline-none disabled:opacity-50 font-sans leading-relaxed"
              style={{ minHeight: 56 }}
            />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                {question.length > 0 ? `${question.length} chars` : "Insight engine"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  disabled={loading || !speechSupported}
                  title={
                    !speechSupported
                      ? "Tu navegador no soporta dictado por voz"
                      : isListening
                      ? "Detener dictado"
                      : "Dictar por voz"
                  }
                  className={`relative inline-flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
                    isListening
                      ? "bg-red-600 border-red-500 text-white animate-pulse shadow-lg shadow-red-900/40"
                      : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-md ring-2 ring-red-500/60 animate-ping" />
                  )}
                  {speechSupported ? (
                    <Mic className="h-3.5 w-3.5 relative" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 relative" />
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !question.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-medium bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/60 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-neutral-800 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Generar Reporte</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
