"use client";

type PromptChipsProps = {
  chips: string[];
  onSelect: (chip: string) => void;
  className?: string;
};

export function PromptChips({ chips, onSelect, className = "" }: PromptChipsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} aria-label="Optional sentence starters">
      {chips.map(chip => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="min-h-10 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-left text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 active:scale-[0.98]"
          aria-label={`Insert sentence starter: ${chip}`}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
