import { useLayoutEffect, useRef } from "react";
import {
  Formatter,
  GhostNote,
  Renderer,
  TabNote,
  TabStave,
  Voice,
} from "vexflow";

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

const MIN_RENDER_WIDTH = 300;
const DEFAULT_RENDER_WIDTH = 560;

const TAB_DURATION_TO_STEPS: Record<TabDuration, number> = {
  quarter: 4,
  eighth: 2,
};

const TAB_DURATION_TO_VEXFLOW: Record<TabDuration, string> = {
  quarter: "4",
  eighth: "8",
};

function getGapDurations(stepCount: number) {
  const durations: string[] = [];
  let remainingSteps = stepCount;

  while (remainingSteps >= 4) {
    durations.push("4");
    remainingSteps -= 4;
  }

  while (remainingSteps >= 2) {
    durations.push("8");
    remainingSteps -= 2;
  }

  while (remainingSteps > 0) {
    durations.push("16");
    remainingSteps -= 1;
  }

  return durations;
}

function buildTabNotes(events: TabEvent[], totalSteps: number) {
  const sortedEvents = [...events].sort((a, b) => a.step - b.step);
  const tabNotes = [];
  let cursor = 0;

  for (const event of sortedEvents) {
    const gapSteps = Math.max(event.step - cursor, 0);

    for (const duration of getGapDurations(gapSteps)) {
      tabNotes.push(new GhostNote(duration));
    }

    tabNotes.push(
      new TabNote(
        {
          positions: event.notes.map((note) => ({
            str: note.string,
            fret: note.fret,
          })),
          duration: TAB_DURATION_TO_VEXFLOW[event.duration],
        },
        true,
      ),
    );

    cursor = Math.max(
      cursor,
      event.step + TAB_DURATION_TO_STEPS[event.duration],
    );
  }

  const trailingSteps = Math.max(totalSteps - cursor, 0);

  for (const duration of getGapDurations(trailingSteps)) {
    tabNotes.push(new GhostNote(duration));
  }

  return tabNotes;
}

function TabNotation({ events, totalSteps, title, compact }: TabNotationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const height = compact ? 132 : 158;

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const render = () => {
      container.replaceChildren();

      const measuredWidth = container.clientWidth || DEFAULT_RENDER_WIDTH;
      const width = Math.max(measuredWidth, MIN_RENDER_WIDTH);
      const horizontalPadding = compact ? 8 : 12;
      const staveWidth = width - horizontalPadding * 2;
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(width, height);

      const context = renderer.getContext();
      const stave = new TabStave(horizontalPadding, 16, staveWidth);
      const notes = buildTabNotes(events, totalSteps);
      const beats = Math.max(totalSteps / 4, 1);
      const voice = new Voice({
        numBeats: beats,
        beatValue: 4,
      });

      stave.addTabGlyph();
      stave.setContext(context).draw();
      voice.addTickables(notes);
      new Formatter()
        .joinVoices([voice])
        .format([voice], staveWidth - 52, { context, stave });
      voice.draw(context, stave);
    };

    render();

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.replaceChildren();
    };
  }, [compact, events, height, totalSteps]);

  return (
    <div
      className="tab-notation"
      ref={containerRef}
      role="img"
      aria-label={`${title} tab notation`}
    />
  );
}

export default TabNotation;
