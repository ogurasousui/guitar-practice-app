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
const TOP_Y = 34;
const STRING_GAP = 22;
const START_X = 46;
const END_X = 610;
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

function getFlagPath(x: number, stemTop: number, duration: TabDuration) {
  if (duration === "quarter") {
    return null;
  }

  const firstFlag = `M ${x + 11} ${stemTop} q 18 8 4 22`;

  if (duration === "eighth") {
    return firstFlag;
  }

  return `${firstFlag} M ${x + 11} ${stemTop + 9} q 18 8 4 22`;
}

function getPositionFret(events: TabEvent[]) {
  const frets = events.flatMap((event) =>
    event.notes
      .map((note) => Number(note.fret))
      .filter((fret) => Number.isFinite(fret) && fret > 0),
  );

  return frets.length > 0 ? Math.min(...frets) : 1;
}

function getFingerLabel(fretText: string, positionFret: number) {
  const fret = Number(fretText);

  if (!Number.isFinite(fret) || fret <= 0) {
    return null;
  }

  return String(Math.min(Math.max(fret - positionFret + 1, 1), 4));
}

function TabNotation({ events, totalSteps, title, compact }: TabNotationProps) {
  const height = compact ? 176 : 220;
  const positionFret = getPositionFret(events);
  const barSteps = Array.from(
    { length: Math.floor(totalSteps / 16) + 1 },
    (_, index) => index * 16,
  );

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

      {barSteps.map((step) => {
        if (step > totalSteps) {
          return null;
        }

        const x = getStepX(step, totalSteps);
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
        const x = getStepX(event.step, totalSteps);
        const stemTop = TOP_Y - 24;
        const stemBottom = Math.min(...event.notes.map((note) => getStringY(note.string))) - 8;
        const labelY = getStringY(6) + 38;
        const flagPath = getFlagPath(x, stemTop, event.duration);

        return (
          <g key={`${event.step}-${index}`}>
            {!compact ? (
              <>
                <line className="tab-stem" x1={x + 11} y1={stemTop} x2={x + 11} y2={stemBottom} />
                {flagPath ? <path className="tab-flag" d={flagPath} /> : null}
              </>
            ) : null}
            {event.notes.map((note, noteIndex) => {
              const badgeWidth = note.fret.length > 1 ? 28 : 22;
              const y = getStringY(note.string);
              const fingerLabel = getFingerLabel(note.fret, positionFret);

              return (
                <g key={`${event.step}-${note.string}-${note.fret}-${noteIndex}`}>
                  {fingerLabel ? (
                    <>
                      <circle className="tab-finger-bg" cx={x} cy={y - 17} r="7" />
                      <text className="tab-finger" x={x} y={y - 13}>
                        {fingerLabel}
                      </text>
                    </>
                  ) : null}
                  <rect
                    className="tab-fret-bg"
                    x={x - badgeWidth / 2}
                    y={y - 10}
                    width={badgeWidth}
                    height="20"
                    rx="4"
                  />
                  <text className="tab-fret" x={x} y={y + 6}>
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
          <text x="46" y={height - 20}>1/4 = quarter</text>
          <text x="188" y={height - 20}>1/8 = eighth</text>
          <text x="316" y={height - 20}>1/16 = sixteenth</text>
        </g>
      ) : null}
    </svg>
  );
}

export default TabNotation;
