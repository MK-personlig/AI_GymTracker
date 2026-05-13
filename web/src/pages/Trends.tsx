import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// ── Muscle mapping ─────────────────────────────────────────────────────────────
const WORKOUT_MUSCLES: Record<string, string[]> = {
  chest: ["chest", "shoulders", "triceps"],
  back:  ["lats", "middle back", "lower back", "traps", "biceps"],
  legs:  ["quadriceps", "hamstrings", "glutes", "calves"],
  abs:   ["abdominals", "obliques"],
  run:   ["quadriceps", "hamstrings", "calves"],
};

const RECOVERY_HOURS = 48;

type WorkoutRow = { date: string; workout_type: string };

function calcRecovery(workouts: WorkoutRow[]): Record<string, number> {
  const now = Date.now();
  const lastTrained: Record<string, number> = {};
  for (const w of workouts) {
    const muscles = WORKOUT_MUSCLES[w.workout_type] ?? [];
    // Treat workout as occurring at noon local time on that date
    const ts = new Date(`${w.date}T12:00:00`).getTime();
    for (const m of muscles) {
      if (!lastTrained[m] || ts > lastTrained[m]) lastTrained[m] = ts;
    }
  }
  const out: Record<string, number> = {};
  for (const [m, ts] of Object.entries(lastTrained)) {
    const h = (now - ts) / 3_600_000;
    out[m] = Math.min(1, h / RECOVERY_HOURS);
  }
  return out;
}

// recovery: 0 = just trained (red) → 1 = fully recovered (green) → undefined = never
function rcColor(pct: number | undefined): string {
  if (pct === undefined) return "#1c1c1c";
  if (pct >= 1) return "hsl(142,60%,28%)";
  return `hsl(${Math.round(pct * 115)},72%,36%)`;
}

function rcOpacity(pct: number | undefined): number {
  return pct === undefined ? 0.35 : 0.85;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Trends() {
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("workouts")
        .select("date, workout_type")
        .gte("date", since)
        .order("date", { ascending: false });
      setWorkouts((data as WorkoutRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const recovery = calcRecovery(workouts);

  return (
    <div className="pb-4 space-y-4">
      <MuscleRecovery recovery={recovery} loading={loading} />
    </div>
  );
}

// ── Muscle recovery card ──────────────────────────────────────────────────────
function MuscleRecovery({
  recovery,
  loading,
}: {
  recovery: Record<string, number>;
  loading: boolean;
}) {
  const [view, setView] = useState<"front" | "back">("front");

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="font-semibold text-sm">Muscle Recovery</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            24 h = 50% · 48 h = 100% recovered
          </p>
        </div>
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-0.5">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === v
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="h-64 rounded-xl bg-neutral-800 animate-pulse" />
        ) : (
          <div className="flex justify-center">
            {view === "front" ? (
              <FrontBody recovery={recovery} />
            ) : (
              <BackBody recovery={recovery} />
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 pb-4">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="h-2 flex-1 rounded-full" style={{
            background: "linear-gradient(to right, hsl(0,72%,36%), hsl(57,72%,36%), hsl(115,60%,28%))"
          }} />
        </div>
        <div className="flex justify-between w-full max-w-[200px] text-[10px] text-neutral-500">
          <span>Just trained</span>
          <span>Recovered</span>
        </div>
      </div>

      {/* Muscle list */}
      <MuscleList recovery={recovery} />
    </div>
  );
}

// ── Muscle status list ────────────────────────────────────────────────────────
const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps",
  forearms: "Forearms", abdominals: "Abs", obliques: "Obliques",
  traps: "Traps", lats: "Lats", "middle back": "Mid Back", "lower back": "Lower Back",
  glutes: "Glutes", quadriceps: "Quads", hamstrings: "Hamstrings", calves: "Calves",
};

function MuscleList({ recovery }: { recovery: Record<string, number> }) {
  const muscles = Object.keys(MUSCLE_LABELS);
  const trained = muscles.filter((m) => recovery[m] !== undefined);
  if (trained.length === 0) return null;

  return (
    <div className="border-t border-neutral-800">
      <div className="grid grid-cols-2 divide-x divide-neutral-800">
        {trained.map((m) => {
          const pct = recovery[m]!;
          const hours = pct >= 1 ? null : Math.round(pct * RECOVERY_HOURS);
          return (
            <div key={m} className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: rcColor(pct) }}
                />
                <span className="text-xs text-neutral-300">{MUSCLE_LABELS[m]}</span>
              </div>
              <span className="text-[10px] text-neutral-500">
                {pct >= 1 ? "Ready" : `${hours}h left`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Front body SVG ────────────────────────────────────────────────────────────
function FrontBody({ recovery }: { recovery: Record<string, number> }) {
  const c = (m: string) => rcColor(recovery[m]);
  const o = (m: string) => rcOpacity(recovery[m]);

  return (
    <svg viewBox="0 0 100 260" className="w-40 h-auto" aria-label="Front body muscle map">
      {/* Body outline */}
      <g fill="#1e1e1e" stroke="#333" strokeWidth="0.6">
        {/* Head */}
        <ellipse cx="50" cy="16" rx="13" ry="14" />
        {/* Neck */}
        <rect x="44" y="29" width="12" height="11" rx="2" />
        {/* Torso */}
        <path d="M38,40 L20,48 L14,54 L12,132 L18,132 L20,56 L26,132 L24,120 L22,136 L38,258 L44,258 L46,136 L50,132 L54,136 L56,258 L62,258 L78,136 L76,120 L74,132 L80,56 L82,132 L88,132 L86,54 L80,48 L62,40 Z" />
        {/* Left arm */}
        <path d="M14,54 L8,60 L8,134 L14,134 L16,132 Z" />
        {/* Right arm */}
        <path d="M86,54 L92,60 L92,134 L86,134 L84,132 Z" />
      </g>

      {/* ── Muscle regions ── */}
      {/* Shoulders */}
      <ellipse cx="18" cy="56" rx="9" ry="8" fill={c("shoulders")} opacity={o("shoulders")} />
      <ellipse cx="82" cy="56" rx="9" ry="8" fill={c("shoulders")} opacity={o("shoulders")} />

      {/* Chest */}
      <ellipse cx="37" cy="70" rx="12" ry="13" fill={c("chest")} opacity={o("chest")} />
      <ellipse cx="63" cy="70" rx="12" ry="13" fill={c("chest")} opacity={o("chest")} />

      {/* Biceps */}
      <ellipse cx="11" cy="90" rx="6" ry="14" fill={c("biceps")} opacity={o("biceps")} />
      <ellipse cx="89" cy="90" rx="6" ry="14" fill={c("biceps")} opacity={o("biceps")} />

      {/* Forearms */}
      <ellipse cx="10" cy="116" rx="5" ry="13" fill={c("forearms")} opacity={o("forearms")} />
      <ellipse cx="90" cy="116" rx="5" ry="13" fill={c("forearms")} opacity={o("forearms")} />

      {/* Triceps (visible on front, sides of arm) */}
      <ellipse cx="14" cy="76" rx="4" ry="12" fill={c("triceps")} opacity={o("triceps") * 0.7} />
      <ellipse cx="86" cy="76" rx="4" ry="12" fill={c("triceps")} opacity={o("triceps") * 0.7} />

      {/* Abs */}
      <ellipse cx="50" cy="100" rx="11" ry="22" fill={c("abdominals")} opacity={o("abdominals")} />

      {/* Obliques */}
      <ellipse cx="31" cy="106" rx="8" ry="16" fill={c("obliques")} opacity={o("obliques")} />
      <ellipse cx="69" cy="106" rx="8" ry="16" fill={c("obliques")} opacity={o("obliques")} />

      {/* Quadriceps */}
      <ellipse cx="37" cy="176" rx="13" ry="26" fill={c("quadriceps")} opacity={o("quadriceps")} />
      <ellipse cx="63" cy="176" rx="13" ry="26" fill={c("quadriceps")} opacity={o("quadriceps")} />

      {/* Calves */}
      <ellipse cx="36" cy="224" rx="9" ry="18" fill={c("calves")} opacity={o("calves")} />
      <ellipse cx="64" cy="224" rx="9" ry="18" fill={c("calves")} opacity={o("calves")} />

      {/* Labels */}
      <text x="50" y="72" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.5)">chest</text>
      <text x="50" y="102" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.5)">abs</text>
      <text x="37" y="178" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)">quads</text>
      <text x="63" y="178" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)">quads</text>
    </svg>
  );
}

// ── Back body SVG ─────────────────────────────────────────────────────────────
function BackBody({ recovery }: { recovery: Record<string, number> }) {
  const c = (m: string) => rcColor(recovery[m]);
  const o = (m: string) => rcOpacity(recovery[m]);

  return (
    <svg viewBox="0 0 100 260" className="w-40 h-auto" aria-label="Back body muscle map">
      {/* Body outline (mirror of front) */}
      <g fill="#1e1e1e" stroke="#333" strokeWidth="0.6">
        <ellipse cx="50" cy="16" rx="13" ry="14" />
        <rect x="44" y="29" width="12" height="11" rx="2" />
        <path d="M38,40 L20,48 L14,54 L12,132 L18,132 L20,56 L26,132 L24,120 L22,136 L38,258 L44,258 L46,136 L50,132 L54,136 L56,258 L62,258 L78,136 L76,120 L74,132 L80,56 L82,132 L88,132 L86,54 L80,48 L62,40 Z" />
        <path d="M14,54 L8,60 L8,134 L14,134 L16,132 Z" />
        <path d="M86,54 L92,60 L92,134 L86,134 L84,132 Z" />
      </g>

      {/* Shoulders */}
      <ellipse cx="18" cy="56" rx="9" ry="8" fill={c("shoulders")} opacity={o("shoulders")} />
      <ellipse cx="82" cy="56" rx="9" ry="8" fill={c("shoulders")} opacity={o("shoulders")} />

      {/* Traps */}
      <ellipse cx="50" cy="56" rx="22" ry="12" fill={c("traps")} opacity={o("traps")} />

      {/* Lats */}
      <ellipse cx="28" cy="88" rx="14" ry="26" fill={c("lats")} opacity={o("lats")} />
      <ellipse cx="72" cy="88" rx="14" ry="26" fill={c("lats")} opacity={o("lats")} />

      {/* Middle back */}
      <ellipse cx="50" cy="86" rx="11" ry="22" fill={c("middle back")} opacity={o("middle back")} />

      {/* Lower back */}
      <ellipse cx="50" cy="116" rx="12" ry="10" fill={c("lower back")} opacity={o("lower back")} />

      {/* Triceps */}
      <ellipse cx="11" cy="86" rx="6" ry="14" fill={c("triceps")} opacity={o("triceps")} />
      <ellipse cx="89" cy="86" rx="6" ry="14" fill={c("triceps")} opacity={o("triceps")} />

      {/* Forearms */}
      <ellipse cx="10" cy="116" rx="5" ry="13" fill={c("forearms")} opacity={o("forearms")} />
      <ellipse cx="90" cy="116" rx="5" ry="13" fill={c("forearms")} opacity={o("forearms")} />

      {/* Glutes */}
      <ellipse cx="37" cy="146" rx="16" ry="16" fill={c("glutes")} opacity={o("glutes")} />
      <ellipse cx="63" cy="146" rx="16" ry="16" fill={c("glutes")} opacity={o("glutes")} />

      {/* Hamstrings */}
      <ellipse cx="37" cy="182" rx="13" ry="26" fill={c("hamstrings")} opacity={o("hamstrings")} />
      <ellipse cx="63" cy="182" rx="13" ry="26" fill={c("hamstrings")} opacity={o("hamstrings")} />

      {/* Calves */}
      <ellipse cx="36" cy="228" rx="9" ry="18" fill={c("calves")} opacity={o("calves")} />
      <ellipse cx="64" cy="228" rx="9" ry="18" fill={c("calves")} opacity={o("calves")} />

      {/* Labels */}
      <text x="50" y="57" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.5)">traps</text>
      <text x="50" y="87" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)">mid back</text>
      <text x="37" y="148" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)">glutes</text>
      <text x="63" y="148" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.5)">glutes</text>
    </svg>
  );
}
