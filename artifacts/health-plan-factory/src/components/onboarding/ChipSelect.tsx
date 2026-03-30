interface ChipSelectProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
  singleExclusive?: string;
}

export function ChipSelect({ options, selected, onChange, maxSelect, singleExclusive }: ChipSelectProps) {
  const toggle = (id: string) => {
    if (singleExclusive && id === singleExclusive) {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }

    if (selected.includes(singleExclusive ?? "")) {
      const next = [id];
      onChange(next);
      return;
    }

    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (maxSelect && selected.length >= maxSelect) return;
      onChange([...selected, id]);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            style={{
              padding: "0.45rem 0.875rem",
              borderRadius: 100,
              border: isSelected ? "1.5px solid var(--navy)" : "1.5px solid rgba(27,45,79,0.2)",
              background: isSelected ? "var(--navy)" : "white",
              color: isSelected ? "white" : "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "var(--app-font-sans)",
              userSelect: "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
