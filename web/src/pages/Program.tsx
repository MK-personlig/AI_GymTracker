import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  filterCatalog,
  catalogForType,
  type CatalogExercise,
} from "../data/exerciseCatalog";

type Row = {
  id: number;
  workout_type: string;
  exercise_name: string;
  default_weight_kg: number | null;
  display_order: number;
  is_bodyweight_base: boolean;
};

/** Row as returned from Supabase before normalizing optional flags */
type ProgramFromDb = Omit<Row, "is_bodyweight_base"> & {
  is_bodyweight_base?: boolean | null;
};

const TYPES = ["chest", "back", "legs"];

export default function Program() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("program")
      .select("*")
      .order("workout_type")
      .order("display_order");
    if (error) setError(error.message);
    else {
      const raw = (data ?? []) as ProgramFromDb[];
      setRows(
        raw.map((r) => ({
          ...r,
          is_bodyweight_base: !!r.is_bodyweight_base,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRow(id: number, patch: Partial<Row>) {
    const { error } = await supabase.from("program").update(patch).eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  async function deleteRow(id: number, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from("program").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  }

  async function addRow(
    type: string,
    name: string,
    weight: string,
    afterOrder: number,
    isBodyweightBase: boolean,
  ) {
    if (!name.trim()) {
      alert("Exercise name required");
      return;
    }
    const { error } = await supabase.from("program").insert({
      workout_type: type,
      exercise_name: name.trim(),
      default_weight_kg: weight === "" ? null : parseFloat(weight),
      display_order: afterOrder + 1,
      is_bodyweight_base: isBodyweightBase,
    });
    if (error) alert(error.message);
    else load();
  }

  async function moveRow(workoutType: string, rowId: number, direction: -1 | 1) {
    const list = rows
      .filter((r) => r.workout_type === workoutType)
      .sort((a, b) => a.display_order - b.display_order);
    const i = list.findIndex((r) => r.id === rowId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    const staging =
      Math.max(...rows.map((r) => r.display_order), 0) + 10_000 + a.id;
    const oa = a.display_order;
    const ob = b.display_order;
    const { error: e1 } = await supabase
      .from("program")
      .update({ display_order: staging })
      .eq("id", a.id);
    if (e1) {
      alert(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("program")
      .update({ display_order: oa })
      .eq("id", b.id);
    if (e2) {
      alert(e2.message);
      await supabase.from("program").update({ display_order: oa }).eq("id", a.id);
      return;
    }
    const { error: e3 } = await supabase
      .from("program")
      .update({ display_order: ob })
      .eq("id", a.id);
    if (e3) alert(e3.message);
    load();
  }

  if (loading) return <p className="text-neutral-500">Loading…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div className="space-y-6 pb-12">
      <p className="text-sm text-neutral-500 px-1">
        Pick from suggestions or type any exercise name. For pull-ups and
        similar, turn on &ldquo;BW&rdquo; and enter only the{" "}
        <strong className="text-neutral-400 font-medium">added</strong> weight
        (belt, vest) in kg — leave empty for unweighted.
      </p>
      {TYPES.map((type) => {
        const typeRows = rows.filter((r) => r.workout_type === type);
        const sorted = [...typeRows].sort(
          (a, b) => a.display_order - b.display_order,
        );
        const maxOrder = typeRows.reduce(
          (m, r) => Math.max(m, r.display_order),
          0,
        );
        const listId = `exercise-catalog-${type}`;
        return (
          <section key={type}>
            <h2 className="text-base font-semibold capitalize mb-2 px-1">
              {type}
            </h2>
            <datalist id={listId}>
              {catalogForType(type).map((e) => (
                <option key={e.name} value={e.name} label={e.label} />
              ))}
            </datalist>
            <div className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
              {typeRows.map((r) => (
                <RowEditor
                  key={r.id}
                  row={r}
                  workoutType={type}
                  catalogListId={listId}
                  onSave={updateRow}
                  onDelete={deleteRow}
                  onMove={(dir) => moveRow(type, r.id, dir)}
                  canMoveUp={sorted[0]?.id !== r.id}
                  canMoveDown={sorted[sorted.length - 1]?.id !== r.id}
                />
              ))}
              <AddRow
                type={type}
                catalogListId={listId}
                onAdd={(name, weight, bw) =>
                  addRow(type, name, weight, maxOrder, bw)
                }
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RowEditor({
  row,
  workoutType,
  catalogListId,
  onSave,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  row: Row;
  workoutType: string;
  catalogListId: string;
  onSave: (id: number, patch: Partial<Row>) => void;
  onDelete: (id: number, name: string) => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [name, setName] = useState(row.exercise_name);
  const [weight, setWeight] = useState<string>(
    row.default_weight_kg?.toString() ?? "",
  );
  const [bwBase, setBwBase] = useState(row.is_bodyweight_base);

  useEffect(() => {
    setName(row.exercise_name);
    setWeight(row.default_weight_kg?.toString() ?? "");
    setBwBase(row.is_bodyweight_base);
  }, [row.id, row.exercise_name, row.default_weight_kg, row.is_bodyweight_base]);

  function save() {
    const newWeight = weight === "" ? null : parseFloat(weight);
    if (
      name !== row.exercise_name ||
      newWeight !== row.default_weight_kg ||
      bwBase !== row.is_bodyweight_base
    ) {
      onSave(row.id, {
        exercise_name: name,
        default_weight_kg: newWeight,
        is_bodyweight_base: bwBase,
      });
    }
  }

  const suggestions = useMemo(
    () => filterCatalog(workoutType, name, 6),
    [workoutType, name],
  );

  const norm = name.trim().toLowerCase().replace(/\s+/g, "_");
  const showQuickPick =
    name.trim().length > 0 &&
    suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0].name === norm);

  function applyCatalogPick(s: CatalogExercise) {
    setName(s.name);
    setBwBase(!!s.bodyweightBase);
    onSave(row.id, {
      exercise_name: s.name,
      default_weight_kg: row.default_weight_kg,
      is_bodyweight_base: !!s.bodyweightBase,
    });
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2 border-b border-neutral-800 last:border-b-0">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
            className="text-neutral-500 hover:text-white disabled:opacity-25 text-xs leading-none px-1"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
            className="text-neutral-500 hover:text-white disabled:opacity-25 text-xs leading-none px-1"
            aria-label="Move down"
          >
            ↓
          </button>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            list={catalogListId}
            className="w-full bg-neutral-800/50 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
          {showQuickPick && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyCatalogPick(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <label
          className="flex flex-col items-center gap-0.5 shrink-0 text-[10px] text-neutral-500 pt-1 w-9"
          title="Bodyweight movement — weight is added load only"
        >
          <span>BW</span>
          <input
            type="checkbox"
            checked={bwBase}
            onChange={(e) => {
              setBwBase(e.target.checked);
              onSave(row.id, { is_bodyweight_base: e.target.checked });
            }}
            className="rounded border-neutral-600"
          />
        </label>
        <div className="flex items-center gap-0.5 shrink-0">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={weight}
            placeholder={bwBase ? "+" : "kg"}
            title={
              bwBase
                ? "Added kg (belt, vest). Empty = unweighted."
                : "Weight in kg"
            }
            onChange={(e) => setWeight(e.target.value)}
            onBlur={save}
            className="w-14 bg-neutral-800/50 rounded px-1 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-neutral-600 placeholder-neutral-600"
          />
          <span className="text-[10px] text-neutral-500 w-7">
            {bwBase ? "add" : "kg"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(row.id, row.exercise_name)}
          className="text-neutral-500 hover:text-red-400 text-xl w-7 leading-none shrink-0 pt-0.5"
          aria-label="Delete"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function AddRow({
  type,
  catalogListId,
  onAdd,
}: {
  type: string;
  catalogListId: string;
  onAdd: (name: string, weight: string, isBodyweightBase: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [bwBase, setBwBase] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => filterCatalog(type, name, 10),
    [type, name],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenSuggest(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function pick(entry: CatalogExercise) {
    setName(entry.name);
    setBwBase(!!entry.bodyweightBase);
    setOpenSuggest(false);
  }

  function submit() {
    onAdd(name, weight, bwBase);
    setName("");
    setWeight("");
    setBwBase(false);
    setOpenSuggest(false);
  }

  return (
    <div
      ref={containerRef}
      className="px-3 py-3 bg-neutral-950 border-t border-neutral-800 space-y-2"
    >
      <div className="text-[11px] uppercase tracking-wide text-neutral-600">
        Add exercise
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search or type name (snake_case)…"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setOpenSuggest(true);
          }}
          onFocus={() => setOpenSuggest(true)}
          list={catalogListId}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="flex-1 min-w-[12rem] bg-neutral-800/80 rounded px-3 py-2 text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        />
        <label className="flex items-center gap-2 text-xs text-neutral-400 whitespace-nowrap">
          <input
            type="checkbox"
            checked={bwBase}
            onChange={(e) => setBwBase(e.target.checked)}
            className="rounded border-neutral-600"
          />
          BW (+kg extra)
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder={bwBase ? "Added kg" : "kg"}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-20 bg-neutral-800/80 rounded px-2 py-2 text-sm text-right placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        />
        <button
          type="button"
          onClick={submit}
          className="px-4 py-2 rounded-lg bg-neutral-200 text-neutral-900 text-sm font-medium hover:bg-white"
        >
          Add
        </button>
      </div>
      {openSuggest && suggestions.length > 0 && (
        <ul className="rounded-md border border-neutral-800 bg-neutral-900 max-h-40 overflow-y-auto text-sm">
          {suggestions.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex justify-between gap-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                <span>{s.label}</span>
                <span className="text-xs text-neutral-500 font-mono shrink-0">
                  {s.name}
                  {s.bodyweightBase ? " · BW" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
