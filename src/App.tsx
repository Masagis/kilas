import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  Feather,
  Check,
  Moon,
  Sun,
  BookOpen,
  ChevronDown,
  Calendar,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalEntry {
  date: string;
  text: string;
}

type FilterType = "all" | "7days" | "30days" | "range";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHARS = 150;
const STORAGE_KEY = "kilas-entries";
const HOME_VISIBLE = 5;

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

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadEntries(): JournalEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through
  }
  return [];
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
  const [page, setPage] = useState<"home" | "all">("home");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kilas-theme") === "dark";
    }
    return false;
  });

  // Filter state (only used on "all" page)
  const [filter, setFilter] = useState<FilterType>("all");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const today = getToday();
  const todayEntry = entries.find((e) => e.date === today);
  const totalEntries = entries.length;

  const sortedEntries = useMemo(
    () => entries.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  // dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("kilas-theme", dark ? "dark" : "light");
  }, [dark]);

  // persist entries
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

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
    if (todayEntry) setText(todayEntry.text);
    setIsEditing(true);
  }, [todayEntry]);

  const showInput = !todayEntry || isEditing;
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;

  // ══════════════════════════════════════════════════════════════════════════
  // Page: All Entries (with filter)
  // ══════════════════════════════════════════════════════════════════════════
  if (page === "all") {
    return (
      <AllEntriesPage
        entries={sortedEntries}
        filter={filter}
        setFilter={setFilter}
        rangeFrom={rangeFrom}
        setRangeFrom={setRangeFrom}
        rangeTo={rangeTo}
        setRangeTo={setRangeTo}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        today={today}
        totalEntries={totalEntries}
        onBack={() => {
          setPage("home");
          setFilter("all");
          setRangeFrom("");
          setRangeTo("");
          setFilterOpen(false);
        }}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Page: Home
  // ══════════════════════════════════════════════════════════════════════════
  const homeEntries = sortedEntries.slice(0, HOME_VISIBLE);
  const hasMore = sortedEntries.length > HOME_VISIBLE;

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
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-foreground/90 dark:bg-muted">
            <Feather className="size-7 text-background dark:text-foreground/80" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kilas
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground/60">
            Abadikan satu cerita. Setiap hari.
          </p>
        </header>

        {/* ── Input / Today's Entry ── */}
        <section id="today-section" className="mb-6">
          {showInput ? (
            <Card className="border-0 bg-card shadow-sm ring-1 ring-foreground/6">
              <CardContent className="space-y-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold tracking-widest text-foreground/70 uppercase">
                    {isEditing ? "Edit Hari Ini" : "Hari Ini"}
                  </span>
                </div>

                <Textarea
                  id="journal-input"
                  placeholder="Kilasan hari ini..."
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value.slice(0, MAX_CHARS + 10))
                  }
                  maxLength={MAX_CHARS + 10}
                  rows={4}
                  className="min-h-[90px] resize-none border-0 bg-transparent px-0 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/35 focus-visible:border-0 focus-visible:ring-0"
                  autoFocus
                />

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
            <Card
              className={`border-0 bg-card shadow-sm ring-1 ring-foreground/6 transition-all duration-500 ${
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
            {totalEntries === 0
              ? "Belum ada cerita yang terabadikan."
              : `${totalEntries} cerita terabadikan.`}
          </p>
        </div>

        {/* ── Thin divider ── */}
        <div className="mx-auto mb-10 h-px w-12 bg-foreground/6" />

        {/* ── Entry List / Empty ── */}
        <section id="history-section">
          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {homeEntries.map((entry) => (
                <EntryItem key={entry.date} entry={entry} />
              ))}

              {hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    id="load-more-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage("all")}
                    className="rounded-full px-6 text-muted-foreground/60"
                  >
                    Selengkapnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-foreground/6" />
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground/25">
            Satu hari. Satu kalimat. Satu cerita.
          </p>
        </footer>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// All Entries Page (with date filter)
// ═══════════════════════════════════════════════════════════════════════════════

interface AllEntriesPageProps {
  entries: JournalEntry[];
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  rangeFrom: string;
  setRangeFrom: (v: string) => void;
  rangeTo: string;
  setRangeTo: (v: string) => void;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  today: string;
  totalEntries: number;
  onBack: () => void;
}

const FILTER_OPTIONS: [FilterType, string][] = [
  ["all", "Semua"],
  ["7days", "7 hari terakhir"],
  ["30days", "30 hari terakhir"],
  ["range", "Rentang tanggal"],
];

function AllEntriesPage({
  entries,
  filter,
  setFilter,
  rangeFrom,
  setRangeFrom,
  rangeTo,
  setRangeTo,
  filterOpen,
  setFilterOpen,
  today,
  totalEntries,
  onBack,
}: AllEntriesPageProps) {
  const filteredEntries = useMemo(() => {
    if (filter === "7days") {
      const cutoff = daysAgo(7);
      return entries.filter((e) => e.date >= cutoff);
    }
    if (filter === "30days") {
      const cutoff = daysAgo(30);
      return entries.filter((e) => e.date >= cutoff);
    }
    if (filter === "range" && rangeFrom && rangeTo) {
      return entries.filter(
        (e) => e.date >= rangeFrom && e.date <= rangeTo
      );
    }
    return entries;
  }, [entries, filter, rangeFrom, rangeTo]);

  const filterLabel =
    FILTER_OPTIONS.find(([v]) => v === filter)?.[1] ?? "Semua";

  return (
    <div className="min-h-svh bg-[hsl(0,0%,96%)] transition-colors duration-300 dark:bg-[hsl(0,0%,8%)]">
      <main className="relative mx-auto w-full max-w-md px-6 pb-16 pt-10 sm:pt-14">
        {/* Back button */}
        <button
          id="back-btn"
          onClick={onBack}
          className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </button>

        {/* Title */}
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          Semua Kilas Balik
        </h2>
        <p className="mb-6 text-xs text-muted-foreground/40">
          {totalEntries} cerita terabadikan.
        </p>

        {/* ── Filter ── */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <button
              id="filter-toggle"
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex w-full items-center justify-between rounded-xl bg-card/80 px-4 py-2.5 text-left ring-1 ring-foreground/6 transition-all hover:ring-foreground/10"
            >
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground/40" />
                <span className="text-[13px] text-foreground/70">
                  {filterLabel}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground/40 transition-transform duration-200 ${
                  filterOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {filterOpen && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-foreground/6">
                {FILTER_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => {
                      setFilter(value);
                      setFilterOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/50 ${
                      filter === value
                        ? "font-medium text-foreground"
                        : "text-foreground/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Range date inputs */}
          {filter === "range" && (
            <div className="flex items-center gap-2">
              <input
                id="range-from"
                type="date"
                value={rangeFrom}
                max={rangeTo || today}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="flex-1 rounded-lg border-0 bg-card/80 px-3 py-2 text-[13px] text-foreground ring-1 ring-foreground/6 focus:outline-none focus:ring-foreground/15"
              />
              <span className="text-xs text-muted-foreground/30">—</span>
              <input
                id="range-to"
                type="date"
                value={rangeTo}
                min={rangeFrom}
                max={today}
                onChange={(e) => setRangeTo(e.target.value)}
                className="flex-1 rounded-lg border-0 bg-card/80 px-3 py-2 text-[13px] text-foreground ring-1 ring-foreground/6 focus:outline-none focus:ring-foreground/15"
              />
            </div>
          )}
        </div>

        {/* ── Filtered results count ── */}
        {filter !== "all" && (
          <p className="mb-4 text-xs text-muted-foreground/35">
            {filteredEntries.length === 0
              ? "Tidak ada cerita di rentang ini."
              : `${filteredEntries.length} cerita ditemukan.`}
          </p>
        )}

        {/* ── Entry List ── */}
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted/60">
              <BookOpen className="size-5 text-muted-foreground/25" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground/40">
              Tidak ada cerita di rentang ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntryItem key={entry.date} entry={entry} />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-foreground/6" />
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground/25">
            Satu hari. Satu kalimat. Satu cerita.
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EntryItem({ entry }: { entry: JournalEntry }) {
  const rel = relativeDateLabel(entry.date);
  return (
    <div className="rounded-xl bg-card/60 px-4 py-3.5 ring-1 ring-foreground/4 transition-all duration-200 hover:bg-card hover:ring-foreground/[0.08]">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground/45">
          {formatDate(entry.date)}
        </span>
        {rel && (
          <span className="text-[10px] text-muted-foreground/25">
            · {rel}
          </span>
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
