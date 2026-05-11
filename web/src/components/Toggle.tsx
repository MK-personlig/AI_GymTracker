type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
};

export default function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-emerald-500" : "bg-neutral-700"
      }`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
