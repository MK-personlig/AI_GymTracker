import { BarChartIcon } from "../components/icons";

export default function Trends() {
  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800 flex items-center justify-center mb-3 text-neutral-400">
          <BarChartIcon />
        </div>
        <p className="text-neutral-200 font-medium mb-1">Charts coming soon</p>
        <p className="text-sm text-neutral-500 max-w-xs mx-auto">
          Log a few more workouts and weight-over-time graphs will appear here.
        </p>
      </div>
    </div>
  );
}
