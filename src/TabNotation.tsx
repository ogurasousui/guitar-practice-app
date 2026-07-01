export type TabDuration = "quarter" | "eighth" | "sixteenth";

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
const VIEWBOX_WIDTH = 760;
const TOP_Y = 44;
const STRING_GAP = 26;
const START_X = 58;
const END_X = 728;
const WIDTH = END_X - START_X;

function getStringY(string: number) {
  return TOP_Y + (string - 1) * STRING_GAP;
}

function getDurationLabel(duration: TabDuration) {
  switch (duration) {
    case "quarter":
      return "1/4";
    case "eighth":
      return "1/8";
    case "sixteenth":
      return "1/16";
  }
}

function getStepX(step: number, totalSteps: number) {
  return START_X + (step / totalSteps) * WIDTH;
}

function getStemFlagPath(x: number, stemTop: number, duration: TabDuration) {
  if (duration === "quarter") {
    return null;
  }

  const firstFlag = `M ${x + 12} ${stemTop} q 20 8 5 23`;

  if (duration === "eighth") {
    return firstFlag;
  }

  return `${firstFlag} M ${x + 12} ${stemTop + 10} q 20 8 5 23`;
}

function TabNotation({ events, totalSteps, title, compact }: TabNotationProps) {
  const height = compact ? 238 : 270;
  const beatSteps = Array.from(
    { length: Math.floor(totalSteps / 4) + 1 },
    (_, index) => index * 4,
  );
  const barSteps = Array.from(
    { length: Math.floor(totalSteps / 16) + 1 },
    (_, index) => index * 16,
  );

  return (
    <svg
      className="tab-notation"
      role="img"
      aria-label={`${title} tab notation`}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
    >
      <rect className="tab-background" width={VIEWBOX_WIDTH} height={height} rx="8" />

      {beatSteps.map((step) => {
        if (step > totalSteps) {
          return null;
        }

        const x = getStepX(step, totalSteps);
        return (
          <line
            className="tab-beat-line"
            key={`beat-${step}`}
            x1={x}
            y1={TOP_Y - 16}
            x2={x}
            y2={getStringY(6) + 15}
          />
        );
      })}

      {barSteps.map((step) => {
        if (step > totalSteps) {
          return null;
        }

        const x = getStepX(step, totalSteps);
        return (
          <line
            className="tab-bar-line"
            key={`bar-${step}`}
            x1={x}
            y1={TOP_Y - 18}
            x2={x}
            y2={getStringY(6) + 17}
          />
        );
      })}

      {STRING_LABELS.map((label, index) => {
        const y = getStringY(index + 1);
        return (
          <g key={label}>
            <text className="tab-string-label" x="20" y={y + 5}>
              {label}
            </text>
            <line className="tab-string-line" x1={START_X} y1={y} x2={END_X} y2={y} />
          </g>
        );
      })}

      {events.map((event, index) => {
        const x = getStepX(event.step, totalSteps);
        const stemTop = TOP_Y - 28;
        const stemBottom = Math.min(...event.notes.map((note) => getStringY(note.string))) - 10;
        const labelY = getStringY(6) + 46;
        const flagPath = getStemFlagPath(x, stemTop, event.duration);

        return (
          <g key={`${event.step}-${index}`}>
            {!compact ? (
              <>
                <line className="tab-stem" x1={x + 12} y1={stemTop} x2={x + 12} y2={stemBottom} />
                {flagPath ? <path className="tab-flag" d={flagPath} /> : null}
              </>
            ) : null}
            {event.notes.map((note, noteIndex) => {
              const badgeWidth = note.fret.length > 1 ? 34 : 28;
              const y = getStringY(note.string);

              return (
                <g key={`${event.step}-${note.string}-${note.fret}-${noteIndex}`}>
                  <rect
                    className="tab-fret-bg"
                    x={x - badgeWidth / 2}
                    y={y - 12}
                    width={badgeWidth}
                    height="24"
                    rx="6"
                  />
                  <text className="tab-fret" x={x} y={y + 7}>
                    {note.fret}
                  </text>
                </g>
              );
            })}
            {!compact ? (
              <text className="tab-duration" x={x} y={labelY}>
                {getDurationLabel(event.duration)}
              </text>
            ) : null}
          </g>
        );
      })}

      {!compact ? (
        <g className="tab-legend">
          <text x="58" y={height - 22}>1/4 = quarter</text>
          <text x="216" y={height - 22}>1/8 = eighth</text>
          <text x="360" y={height - 22}>1/16 = sixteenth</text>
        </g>
      ) : null}
    </svg>
  );
}

export default TabNotation;
