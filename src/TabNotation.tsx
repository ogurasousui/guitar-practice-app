export type TabDuration = "quarter" | "eighth";

export type TabEvent = {
  step: number;
  duration: TabDuration;
  notes: Array<{
    string: 1 | 2 | 3 | 4 | 5 | 6;
    fret: string;
  }>;
};

type TabNotationProps = {
  events: TabEvent[];
  totalSteps: number;
  title: string;
  compact?: boolean;
};

const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];
const TOP_Y = 34;
const STRING_GAP = 22;
const START_X = 46;
const END_X = 610;
const WIDTH = END_X - START_X;

function getStringY(string: number) {
  return TOP_Y + (string - 1) * STRING_GAP;
}

function getDurationLabel(duration: TabDuration) {
  return duration === "quarter" ? "1/4" : "1/8";
}

function TabNotation({ events, totalSteps, title, compact }: TabNotationProps) {
  const height = compact ? 192 : 220;

  return (
    <svg
      className="tab-notation"
      role="img"
      aria-label={`${title} tab notation`}
      viewBox={`0 0 640 ${height}`}
    >
      <rect className="tab-background" width="640" height={height} rx="8" />
      {STRING_LABELS.map((label, index) => {
        const y = getStringY(index + 1);
        return (
          <g key={label}>
            <text className="tab-string-label" x="18" y={y + 5}>
              {label}
            </text>
            <line className="tab-string-line" x1={START_X} y1={y} x2={END_X} y2={y} />
          </g>
        );
      })}

      {[0, 16, 32].map((step) => {
        if (step > totalSteps) {
          return null;
        }

        const x = START_X + (step / totalSteps) * WIDTH;
        return (
          <line
            className="tab-bar-line"
            key={step}
            x1={x}
            y1={TOP_Y - 11}
            x2={x}
            y2={getStringY(6) + 11}
          />
        );
      })}

      {events.map((event, index) => {
        const x = START_X + (event.step / totalSteps) * WIDTH;
        const stemTop = TOP_Y - 24;
        const stemBottom = Math.min(...event.notes.map((note) => getStringY(note.string))) - 8;
        const labelY = getStringY(6) + 38;

        return (
          <g key={`${event.step}-${index}`}>
            <line className="tab-stem" x1={x + 11} y1={stemTop} x2={x + 11} y2={stemBottom} />
            {event.duration === "eighth" ? (
              <path className="tab-flag" d={`M ${x + 11} ${stemTop} q 18 8 4 22`} />
            ) : null}
            {event.notes.map((note) => (
              <g key={`${event.step}-${note.string}-${note.fret}`}>
                <rect
                  className="tab-fret-bg"
                  x={x - 5}
                  y={getStringY(note.string) - 11}
                  width={note.fret.length > 1 ? 28 : 22}
                  height="20"
                  rx="4"
                />
                <text className="tab-fret" x={x + 6} y={getStringY(note.string) + 6}>
                  {note.fret}
                </text>
              </g>
            ))}
            {!compact ? (
              <text className="tab-duration" x={x + 6} y={labelY}>
                {getDurationLabel(event.duration)}
              </text>
            ) : null}
          </g>
        );
      })}

      {!compact ? (
        <g className="tab-legend">
          <text x="46" y={height - 20}>1/4 = quarter note</text>
          <text x="218" y={height - 20}>1/8 = eighth note</text>
        </g>
      ) : null}
    </svg>
  );
}

export default TabNotation;
