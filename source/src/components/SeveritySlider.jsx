const LEVELS = [
  { value: 1, label: 'Ambulatory' },
  { value: 3, label: 'Laceration' },
  { value: 4, label: 'Fracture' },
  { value: 5, label: 'Hemorrhage' },
  { value: 6, label: 'Respiratory' },
  { value: 7, label: 'Unresponsive' }
];

/**
 * SeveritySlider
 * Lets the operator confirm or override the model's coarse suggestion
 * with their own field judgment — always authoritative over the model.
 */
export default function SeveritySlider({ value, onChange }) {
  return (
    <div className="severity-slider">
      <p className="severity-label">Operator assessment (overrides AI suggestion)</p>
      <div className="severity-options">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.value}
            className={`severity-chip ${value === lvl.value ? 'active' : ''}`}
            onClick={() => onChange(lvl.value)}
            type="button"
          >
            {lvl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
