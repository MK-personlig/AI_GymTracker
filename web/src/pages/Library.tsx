import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import Sheet from "../components/Sheet";
import { PlusIcon, SearchIcon, TrashIcon, XIcon } from "../components/icons";

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  force: string | null;
  mechanic: string | null;
  instructions: string[];
  is_custom: boolean;
};

const MUSCLE_FILTERS = [
  { label: "All", value: null },
  { label: "Chest", value: "chest" },
  { label: "Back", value: "lats" },
  { label: "Legs", value: "quadriceps" },
  { label: "Abs", value: "abdominals" },
  { label: "Shoulders", value: "shoulders" },
  { label: "Arms", value: "biceps" },
];

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-300",
  intermediate: "bg-sky-500/15 text-sky-300",
  expert: "bg-orange-500/15 text-orange-300",
};

function muscleColor(muscle: string): string {
  if (["chest"].includes(muscle)) return "bg-sky-500/15 text-sky-300";
  if (["lats", "middle back", "lower back", "traps"].includes(muscle)) return "bg-violet-500/15 text-violet-300";
  if (["quadriceps", "hamstrings", "glutes", "calves"].includes(muscle)) return "bg-emerald-500/15 text-emerald-300";
  if (["abdominals", "obliques"].includes(muscle)) return "bg-rose-500/15 text-rose-300";
  return "bg-neutral-800 text-neutral-400";
}

export default function Library() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchExercises(), 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search, muscleFilter]);

  async function fetchExercises() {
    setLoading(true);
    let q = supabase
      .from("exercise_library")
      .select("*", { count: "exact" })
      .order("name")
      .limit(50);

    if (search.trim()) {
      q = q.ilike("name", `%${search.trim()}%`);
    }
    if (muscleFilter) {
      q = q.contains("primary_muscles", [muscleFilter]);
    }

    const { data, count } = await q;
    setExercises((data as Exercise[]) ?? []);
    if (count !== null) setTotal(count);
    setLoading(false);
  }

  async function deleteCustom(id: string) {
    await supabase.from("exercise_library").delete().eq("id", id);
    setSelected(null);
    fetchExercises();
  }

  return (
    <div className="pb-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
        />
      </div>

      {/* Muscle filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {MUSCLE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setMuscleFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              muscleFilter === f.value
                ? "bg-white text-black"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count + add custom */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-neutral-500">
          {loading ? "Searching…" : total !== null ? `${total.toLocaleString()} exercises` : ""}
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add custom
        </button>
      </div>

      {/* List */}
      {exercises.length === 0 && !loading ? (
        <p className="text-center text-sm text-neutral-500 py-10">No exercises found.</p>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
          {exercises.map((ex, i) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors ${
                i < exercises.length - 1 ? "border-b border-neutral-800" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-neutral-100">{ex.name}</span>
                  {ex.is_custom && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ex.primary_muscles?.slice(0, 3).map((m) => (
                    <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${muscleColor(m)}`}>
                      {m}
                    </span>
                  ))}
                  {ex.equipment && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-neutral-800 text-neutral-500">
                      {ex.equipment}
                    </span>
                  )}
                </div>
              </div>
              {ex.level && (
                <span className={`shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded mt-0.5 ${LEVEL_COLORS[ex.level] ?? "bg-neutral-800 text-neutral-500"}`}>
                  {ex.level}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {total !== null && total > 50 && (
        <p className="text-center text-xs text-neutral-600">
          Showing first 50 — search to narrow down
        </p>
      )}

      {/* Detail sheet */}
      {selected && (
        <Sheet open onClose={() => setSelected(null)} title={selected.name}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {selected.primary_muscles?.map((m) => (
                <span key={m} className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${muscleColor(m)}`}>
                  {m}
                </span>
              ))}
              {selected.secondary_muscles?.map((m) => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-neutral-800 text-neutral-500">
                  {m}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {selected.equipment && <InfoTile label="Equipment" value={selected.equipment} />}
              {selected.level && <InfoTile label="Level" value={selected.level} />}
              {selected.category && <InfoTile label="Category" value={selected.category} />}
              {selected.force && <InfoTile label="Force" value={selected.force} />}
              {selected.mechanic && <InfoTile label="Mechanic" value={selected.mechanic} />}
            </div>

            {selected.instructions?.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-2">
                  Instructions
                </p>
                <ol className="space-y-2">
                  {selected.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-neutral-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 text-[11px] font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {selected.is_custom && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${selected.name}"?`)) deleteCustom(selected.id);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-950/40 text-sm font-medium"
              >
                <TrashIcon className="w-4 h-4" />
                Delete custom exercise
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* Add custom sheet */}
      {adding && (
        <AddCustomSheet
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); fetchExercises(); }}
        />
      )}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700">
      <p className="text-[9px] uppercase tracking-wider font-semibold text-neutral-500 mb-0.5">{label}</p>
      <p className="text-xs font-medium capitalize">{value}</p>
    </div>
  );
}

// ── Shared muscle picker ──────────────────────────────────────────────────────

const ALL_MUSCLES = [
  "chest", "lats", "middle back", "lower back", "traps",
  "quadriceps", "hamstrings", "glutes", "calves",
  "abdominals", "obliques", "shoulders", "biceps", "triceps", "forearms",
];

function MusclePicker({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: string[];
  onToggle: (m: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {ALL_MUSCLES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onToggle(m)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              selected.includes(m)
                ? "bg-white text-black font-semibold"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add custom sheet ──────────────────────────────────────────────────────────

const CATEGORIES = [
  "Strength", "Cardio", "Stretching", "Plyometrics",
  "Olympic Weightlifting", "Powerlifting", "Strongman",
];

function AddCustomSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [equipment, setEquipment] = useState("");
  const [level, setLevel] = useState("beginner");
  const [force, setForce] = useState("");
  const [mechanic, setMechanic] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  function togglePrimary(m: string) {
    setPrimaryMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
    // auto-remove from secondary if added to primary
    setSecondaryMuscles((prev) => prev.filter((x) => x !== m));
  }

  function toggleSecondary(m: string) {
    setSecondaryMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
    // auto-remove from primary if added to secondary
    setPrimaryMuscles((prev) => prev.filter((x) => x !== m));
  }

  function setStep(i: number, value: string) {
    setInstructions((prev) => { const next = [...prev]; next[i] = value; return next; });
  }

  function addStep() {
    setInstructions((prev) => [...prev, ""]);
  }

  function removeStep(i: number) {
    setInstructions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const id = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_custom_" + Date.now();
    const cleanSteps = instructions.map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("exercise_library").insert({
      id,
      name: name.trim(),
      category: category || null,
      equipment: equipment.trim() || null,
      level,
      force: force || null,
      mechanic: mechanic || null,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      instructions: cleanSteps,
      is_custom: true,
    });
    setSaving(false);
    if (error) alert(error.message);
    else onSaved();
  }

  const canSave = name.trim().length > 0 && !saving;

  return (
    <Sheet open onClose={onClose} title="Add custom exercise">
      <div className="space-y-5">

        {/* Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cable Fly"
            autoFocus
            className="w-full bg-neutral-800 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-neutral-600 placeholder-neutral-500"
          />
        </div>

        {/* Category + Level */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 text-neutral-200"
            >
              <option value="">— none —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 text-neutral-200"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        {/* Equipment + Force + Mechanic */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Equipment</label>
            <input
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. cable"
              className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Force</label>
            <select
              value={force}
              onChange={(e) => setForce(e.target.value)}
              className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 text-neutral-200"
            >
              <option value="">—</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="static">Static</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">Mechanic</label>
            <select
              value={mechanic}
              onChange={(e) => setMechanic(e.target.value)}
              className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 text-neutral-200"
            >
              <option value="">—</option>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
            </select>
          </div>
        </div>

        {/* Primary muscles */}
        <MusclePicker
          label="Primary muscles"
          selected={primaryMuscles}
          onToggle={togglePrimary}
        />

        {/* Secondary muscles */}
        <MusclePicker
          label="Secondary muscles"
          selected={secondaryMuscles}
          onToggle={toggleSecondary}
        />

        {/* Instructions */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block mb-2">
            Instructions
          </label>
          <div className="space-y-2">
            {instructions.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 mt-2.5 rounded-full bg-neutral-800 text-neutral-500 text-[11px] font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <textarea
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                  placeholder={`Step ${i + 1}…`}
                  rows={2}
                  className="flex-1 bg-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 placeholder-neutral-600 resize-none"
                />
                {instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="shrink-0 mt-2 p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addStep}
            className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add step
          </button>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={!canSave}
          className="w-full py-3.5 rounded-lg bg-white text-black font-semibold disabled:opacity-40"
        >
          {saving ? "Saving…" : "Add exercise"}
        </button>

      </div>
    </Sheet>
  );
}
