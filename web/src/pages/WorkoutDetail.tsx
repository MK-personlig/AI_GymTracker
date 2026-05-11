import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ChevronLeftIcon } from "../components/icons";

type Workout = {
  id: string;
  date: string;
  workout_type: string;
  notes: string | null;
  raw_message: string | null;
};
type SetRow = {
  id: string;
  exercise_name: string;
  weight_kg: number | null;
  skipped: boolean;
  is_deviation: boolean;
};
type Run = {
  duration_minutes: number | null;
  distance_km: number | null;
  notes: string | null;
};

const TYPE_STYLES: Record<string, string> = {
  chest: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  back: "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30",
  legs: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  run: "bg-orange-500/15 text-orange-300 ring-1 ring-inset ring-orange-500/30",
};

function labelize(name: string) {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: w, error: we }, { data: s }, { data: r }] =
        await Promise.all([
          supabase.from("workouts").select("*").eq("id", id).single(),
          supabase.from("sets").select("*").eq("workout_id", id),
          supabase
            .from("runs")
            .select("*")
            .eq("workout_id", id)
            .maybeSingle(),
        ]);
      if (we) setError(we.message);
      else {
        setWorkout(w);
        setSets(s || []);
        setRun(r ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading)
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 rounded bg-neutral-900 animate-pulse" />
        <div className="h-24 rounded-xl bg-neutral-900 animate-pulse" />
        <div className="h-48 rounded-xl bg-neutral-900 animate-pulse" />
      </div>
    );
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!workout) return <p className="text-neutral-500">Not found.</p>;

  const deviationCount = sets.filter((s) => s.is_deviation).length;
  const skippedCount = sets.filter((s) => s.skipped).length;

  return (
    <div className="pb-4 space-y-4">
      <Link
        to="/workouts"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-white -ml-1"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        All workouts
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
              TYPE_STYLES[workout.workout_type] ??
              "bg-neutral-800 text-neutral-400"
            }`}
          >
            {workout.workout_type}
          </span>
          <h2 className="text-xl font-semibold mt-2">
            {formatFullDate(workout.date)}
          </h2>
        </div>
      </header>

      {(deviationCount > 0 || skippedCount > 0) && (
        <div className="flex gap-2 text-xs">
          {deviationCount > 0 && (
            <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-300 ring-1 ring-inset ring-yellow-500/30">
              {deviationCount} deviation{deviationCount === 1 ? "" : "s"}
            </span>
          )}
          {skippedCount > 0 && (
            <span className="px-2 py-1 rounded-md bg-neutral-800 text-neutral-400 ring-1 ring-inset ring-neutral-700">
              {skippedCount} skipped
            </span>
          )}
        </div>
      )}

      {workout.raw_message && (
        <Box label="What you typed">{workout.raw_message}</Box>
      )}
      {workout.notes && <Box label="Notes">{workout.notes}</Box>}

      {workout.workout_type === "run" && run && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Duration">
            {run.duration_minutes ? `${run.duration_minutes} min` : "—"}
          </StatCard>
          <StatCard label="Distance">
            {run.distance_km ? `${run.distance_km} km` : "—"}
          </StatCard>
        </div>
      )}

      {sets.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-400 px-1 mb-2">
            Sets
          </h3>
          <div className="rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
            {sets.map((s) => (
              <div
                key={s.id}
                className={`flex justify-between items-center px-4 py-3 border-b border-neutral-800 last:border-b-0 ${
                  s.is_deviation ? "bg-yellow-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-sm truncate ${
                      s.skipped
                        ? "text-neutral-500 line-through"
                        : "text-neutral-100"
                    }`}
                  >
                    {labelize(s.exercise_name)}
                  </span>
                  {s.is_deviation && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 shrink-0">
                      Deviation
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm shrink-0 ${
                    s.skipped ? "text-neutral-600" : "text-neutral-300"
                  }`}
                >
                  {s.skipped
                    ? "skipped"
                    : s.weight_kg !== null
                      ? `${s.weight_kg} kg`
                      : "bw"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Box({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-1">
        {label}
      </p>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold">{children}</p>
    </div>
  );
}
