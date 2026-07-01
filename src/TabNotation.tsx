import { useEffect, useRef, useState } from "react";

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

type VexFlowModule = typeof import("vexflow");
type VexFlowTickable =
  | InstanceType<typeof import("vexflow").TabNote>
  | InstanceType<typeof import("vexflow").GhostNote>;

const MIN_RENDER_WIDTH = 300;
const DEFAULT_RENDER_WIDTH = 560;

const TAB_DURATION_TO_STEPS: Record<TabDuration, number> = {
  quarter: 4,
  eighth: 2,
  sixteenth: 1,
};

const TAB_DURATION_TO_VEXFLOW: Record<TabDuration, string> = {
  quarter: "4",
  eighth: "8",
  sixteenth: "16",
};

let vexFlowModulePromise: Promise<VexFlowModule> | null = null;

function loadVexFlow() {
  vexFlowModulePromise ??= import("vexflow");
  return vexFlowModulePromise;
}

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

function buildTabNotes(
  vexFlow: VexFlowModule,
  events: TabEvent[],
  totalSteps: number,
) {
  const sortedEvents = [...events].sort((a, b) => a.step - b.step);
  const tabNotes: VexFlowTickable[] = [];
  let cursor = 0;

  for (const event of sortedEvents) {
    const gapSteps = Math.max(event.step - cursor, 0);

    for (const duration of getGapDurations(gapSteps)) {
      tabNotes.push(new vexFlow.GhostNote(duration));
    }

    tabNotes.push(
      new vexFlow.TabNote(
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
    tabNotes.push(new vexFlow.GhostNote(duration));
  }

  return tabNotes;
}

function TabNotation({ events, totalSteps, title, compact }: TabNotationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const height = compact ? 132 : 158;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    setStatus("loading");
    container.replaceChildren();

    loadVexFlow()
      .then((vexFlow) => {
        if (!isMounted) {
          return;
        }

        const render = () => {
          renderTabNotation(container, vexFlow, events, totalSteps, compact, height);
        };

        try {
          render();
          resizeObserver = new ResizeObserver(render);
          resizeObserver.observe(container);
          setStatus("ready");
        } catch {
          container.replaceChildren();
          setStatus("error");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
      resizeObserver?.disconnect();
      container.replaceChildren();
    };
  }, [compact, events, height, totalSteps]);

  return (
    <div className="tab-notation" role="img" aria-label={`${title} tab notation`}>
      <div className="tab-notation-canvas" ref={containerRef} />
      {status === "loading" ? <span>Loading tab...</span> : null}
      {status === "error" ? <span>Tab could not render.</span> : null}
    </div>
  );
}

function renderTabNotation(
  container: HTMLDivElement,
  vexFlow: VexFlowModule,
  events: TabEvent[],
  totalSteps: number,
  compact: boolean | undefined,
  height: number,
) {
  container.replaceChildren();

  const measuredWidth = container.clientWidth || DEFAULT_RENDER_WIDTH;
  const width = Math.max(measuredWidth, MIN_RENDER_WIDTH);
  const horizontalPadding = compact ? 8 : 12;
  const staveWidth = width - horizontalPadding * 2;
  const renderer = new vexFlow.Renderer(container, vexFlow.Renderer.Backends.SVG);
  renderer.resize(width, height);

  const context = renderer.getContext();
  const stave = new vexFlow.TabStave(horizontalPadding, 16, staveWidth);
  const notes = buildTabNotes(vexFlow, events, totalSteps);
  const beats = Math.max(totalSteps / 4, 1);
  const voice = new vexFlow.Voice({
    numBeats: beats,
    beatValue: 4,
  });

  voice.setStrict(false);
  stave.addTabGlyph();
  stave.setContext(context).draw();
  voice.addTickables(notes);
  new vexFlow.Formatter()
    .joinVoices([voice])
    .format([voice], staveWidth - 52, { context, stave });
  voice.draw(context, stave);
}

export default TabNotation;
