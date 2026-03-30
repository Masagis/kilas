import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  PenLine,
  Check,
  Moon,
  Sun,
  BookOpen,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalEntry {
  date: string;
  text: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHARS = 150;
const STORAGE_KEY = "kilas-entries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function relativeDateLabel(dateStr: string): string | null {
  const today = getToday();
  const todayDate = new Date(today + "T00:00:00");
  const targetDate = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round(
    (todayDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays <= 7) return `${diffDays} hari lalu`;
  return null;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

function getMockEntries(): JournalEntry[] {
  const today = new Date();

  const d1 = new Date(today);
  d1.setDate(d1.getDate() - 1);

  const d2 = new Date(today);
  d2.setDate(d2.getDate() - 3);

  const d3 = new Date(today);
  d3.setDate(d3.getDate() - 7);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return [
    {
      date: fmt(d1),
      text: "Hari ini hujan deras, tapi aku menemukan kedai kopi baru yang sangat nyaman.",
    },
    {
      date: fmt(d2),
      text: "Membaca buku lama yang sudah lama terlupakan. Rasanya seperti bertemu teman lama.",
    },
    {
      date: fmt(d3),
      text: "Matahari terbenam hari ini luar biasa indah. Langit berwarna jingga keemasan.",
    },
  ];
}

function loadEntries(): JournalEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through
  }
  const mock = getMockEntries();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
  return mock;
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries);
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedAnimation, setSavedAnimation] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kilas-theme") === "dark";
    }
    return false;
  });

  const today = getToday();
  const todayEntry = entries.find((e) => e.date === today);
  const pastEntries = entries
    .filter((e) => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalEntries = entries.length;

  // dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("kilas-theme", dark ? "dark" : "light");
  }, [dark]);

  // persist entries
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  // populate textarea when editing
  useEffect(() => {
    if (isEditing && todayEntry) {
      setText(todayEntry.text);
    }
  }, [isEditing, todayEntry]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setEntries((prev) => {
      const existing = prev.findIndex((e) => e.date === today);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { date: today, text: trimmed };
        return updated;
      }
      return [{ date: today, text: trimmed }, ...prev];
    });

    setText("");
    setIsEditing(false);
    setSavedAnimation(true);
    setTimeout(() => setSavedAnimation(false), 1500);
  }, [text, today]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const showInput = !todayEntry || isEditing;
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="min-h-svh bg-[hsl(0,0%,96%)] transition-colors duration-300 dark:bg-[hsl(0,0%,8%)]">
      <main className="relative mx-auto w-full max-w-md px-6 pb-16 pt-10 sm:pt-14">
        {/* ── Dark mode toggle ── */}
        <button
          id="theme-toggle"
          onClick={() => setDark((d) => !d)}
          className="absolute right-6 top-10 flex size-9 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-foreground sm:top-14"
          aria-label="Ganti tema"
        >
          {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        {/* ── Header ── */}
        <header id="app-header" className="mb-10 flex flex-col items-center text-center">
          {/* Icon circle */}
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/90 shadow-lg shadow-foreground/5">
            <PenLine className="size-7 text-background" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kilas
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground/60">
            Abadikan satu pikiran. Setiap hari.
          </p>
        </header>

        {/* ── Input / Today's Entry ── */}
        <section id="today-section" className="mb-6">
          {showInput ? (
            <Card className="border-0 bg-card shadow-sm ring-1 ring-foreground/[0.06]">
              <CardContent className="space-y-4 pt-1">
                {/* Label */}
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold tracking-widest text-foreground/70 uppercase">
                    {isEditing ? "Edit Hari Ini" : "Hari Ini"}
                  </span>
                </div>

                {/* Textarea */}
                <Textarea
                  id="journal-input"
                  placeholder="Apa yang ada di pikiranmu hari ini?"
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value.slice(0, MAX_CHARS + 10))
                  }
                  maxLength={MAX_CHARS + 10}
                  rows={4}
                  className="min-h-[90px] resize-none border-0 bg-transparent px-0 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/35 focus-visible:border-0 focus-visible:ring-0"
                  autoFocus
                />

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs tabular-nums transition-colors ${
                      isOverLimit
                        ? "font-medium text-destructive"
                        : charCount >= MAX_CHARS * 0.85
                          ? "text-amber-500/70"
                          : "text-muted-foreground/30"
                    }`}
                  >
                    {charCount}/{MAX_CHARS}
                  </span>

                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <Button
                        id="cancel-edit-btn"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setText("");
                        }}
                        className="text-muted-foreground/60"
                      >
                        Batal
                      </Button>
                    )}
                    <Button
                      id="save-btn"
                      size="sm"
                      onClick={handleSave}
                      disabled={!text.trim() || isOverLimit}
                      className="gap-1.5 rounded-full px-4"
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                      Simpan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Saved today card */
            <Card
              className={`border-0 bg-card shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-500 ${
                savedAnimation ? "ring-emerald-500/20 shadow-md" : ""
              }`}
            >
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full transition-colors duration-500 ${
                          savedAnimation
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="text-xs font-semibold tracking-widest text-foreground/70 uppercase">
                        Hari Ini
                      </span>
                    </div>
                    <p className="text-[15px] leading-relaxed text-foreground/85">
                      {todayEntry?.text}
                    </p>
                  </div>
                  <Button
                    id="edit-btn"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleEdit}
                    className="mt-0.5 text-muted-foreground/30 hover:text-foreground/60"
                    aria-label="Edit kilasan hari ini"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── Total counter ── */}
        <div className="mb-2 text-center">
          <p className="text-[13px] text-muted-foreground/40">
            {totalEntries === 0 ? (
              "Belum ada kenangan yang terabadikan"
            ) : (
              <>
                Total jurnal:{" "}
                <span className="font-semibold text-muted-foreground/60">
                  {totalEntries}
                </span>
              </>
            )}
          </p>
        </div>

        {/* ── Thin divider ── */}
        <div className="mx-auto mb-10 h-px w-12 bg-foreground/[0.06]" />

        {/* ── History / Empty ── */}
        <section id="history-section">
          {pastEntries.length === 0 && !todayEntry ? (
            <EmptyState />
          ) : pastEntries.length === 0 && todayEntry ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted/60">
                <BookOpen className="size-6 text-muted-foreground/25" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground/40">
                Kenangan pertamamu sudah tersimpan ✨
              </p>
              <p className="mt-1 text-xs text-muted-foreground/25">
                Kembali besok untuk menambah kilasan baru.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastEntries.map((entry) => (
                <HistoryCard key={entry.date} entry={entry} />
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-foreground/[0.06]" />
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground/25">
            Satu baris. Satu hari. Satu kamu.
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HistoryCard({ entry }: { entry: JournalEntry }) {
  const rel = relativeDateLabel(entry.date);

  return (
    <div className="group rounded-xl bg-card/60 px-4 py-3.5 ring-1 ring-foreground/[0.04] transition-all duration-200 hover:bg-card hover:ring-foreground/[0.08]">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground/45">
          {formatDate(entry.date)}
        </span>
        {rel && (
          <span className="text-[10px] text-muted-foreground/25">· {rel}</span>
        )}
      </div>
      <p className="text-[14px] leading-relaxed text-foreground/65">
        {entry.text}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted/60">
        <BookOpen className="size-6 text-muted-foreground/25" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-muted-foreground/45">
        Perjalananmu dimulai di sini.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/25">
        Tulis kilasan pertamamu di atas.
      </p>
    </div>
  );
}
