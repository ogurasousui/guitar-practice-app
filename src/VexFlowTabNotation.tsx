import { useEffect, useRef, useState } from "react";
import type { TabDuration, TabEvent } from "./TabNotation";

type VexFlowRenderContext = {
  setFont?: (family: string, size: number, weight?: string) => void;
};

type VexFlowRenderer = {
  resize: (width: number, height: number) => void;
  getContext: () => VexFlowRenderContext;
};

type VexFlowRendererConstructor = {
  new (element: HTMLElement, backend: number): VexFlowRenderer;
  Backends: {
    SVG: number;
  };
};

type VexFlowTabStave = {
  addClef: (clef: string) => VexFlowTabStave;
  setContext: (context: VexFlowRenderContext) => VexFlowTabStave;
  draw: () => void;
};

type VexFlowTabNote = unknown;

type VexFlowApi = {
  Renderer: VexFlowRendererConstructor;
  TabStave: new (x: number, y: number, width: number) => VexFlowTabStave;
  TabNote: new (note: {
    positions: Array<{ str: number; fret: string }>;
    duration: string;
  }) => VexFlowTabNote;
  GhostNote: new (duration: string | { duration: string }) => VexFlowTabNote;
  Formatter: {
    FormatAndDraw: (
      context: VexFlowRenderContext,
      stave: VexFlowTabStave,
      notes: VexFlowTabNote[],
    ) => void;
  };
};

declare global {
  interface Window {
    VexFlow?: VexFlowApi;
  }
}

type VexFlowTabNotationProps = {
  events: TabEvent[];
  totalSteps: number;
  title: string;
};

const VEXFLOW_SCRIPT_ID = "vexflow-cdn-script";
const VEXFLOW_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js";

let vexFlowLoadPromise: Promise<VexFlowApi> | null = null;

function VexFlowTabNotation({ events, totalSteps, title }: VexFlowTabNotationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    loadVexFlow()
      .then((vexFlow) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        drawTab(containerRef.current, vexFlow, events, totalSteps);
        setStatus("ready");
      })
      .catch(() => {
        if (isMounted) {
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [events, totalSteps]);

  return (
    <div
      className="vexflow-tab-notation"
      role="img"
      aria-label={`${title} VexFlow tab notation`}
    >
      <div className="vexflow-tab-canvas" ref={containerRef} />
      {status === "loading" ? <span>Loading VexFlow...</span> : null}
      {status === "error" ? <span>VexFlow could not render this tab.</span> : null}
    </div>
  );
}

function loadVexFlow() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("VexFlow needs a browser environment."));
  }

  if (window.VexFlow) {
    return Promise.resolve(window.VexFlow);
  }

  if (vexFlowLoadPromise) {
    return vexFlowLoadPromise;
  }

  vexFlowLoadPromise = new Promise<VexFlowApi>((resolve, reject) => {
    const existingScript = document.getElementById(VEXFLOW_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.VexFlow) {
          resolve(window.VexFlow);
        } else {
          reject(new Error("VexFlow did not expose a global API."));
        }
      });
      existingScript.addEventListener("error", () => reject(new Error("VexFlow failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.id = VEXFLOW_SCRIPT_ID;
    script.src = VEXFLOW_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.VexFlow) {
        resolve(window.VexFlow);
      } else {
        reject(new Error("VexFlow did not expose a global API."));
      }
    };
    script.onerror = () => reject(new Error("VexFlow failed to load."));

    document.head.appendChild(script);
  });

  return vexFlowLoadPromise;
}

function drawTab(
  container: HTMLElement,
  vexFlow: VexFlowApi,
  events: TabEvent[],
  totalSteps: number,
) {
  container.replaceChildren();

  const width = totalSteps > 16 ? 760 : 620;
  const height = 180;
  const renderer = new vexFlow.Renderer(container, vexFlow.Renderer.Backends.SVG);
  renderer.resize(width, height);

  const context = renderer.getContext();
  context.setFont?.("Arial", 10);

  const stave = new vexFlow.TabStave(10, 34, width - 20);
  stave.addClef("tab").setContext(context).draw();

  vexFlow.Formatter.FormatAndDraw(
    context,
    stave,
    buildTimelineNotes(vexFlow, events, totalSteps),
  );
}

function buildTimelineNotes(
  vexFlow: VexFlowApi,
  events: TabEvent[],
  totalSteps: number,
) {
  const sortedEvents = [...events].sort((firstEvent, secondEvent) => {
    return firstEvent.step - secondEvent.step;
  });
  const notes: VexFlowTabNote[] = [];
  let cursorStep = 0;

  sortedEvents.forEach((event) => {
    appendGhostNotes(vexFlow, notes, event.step - cursorStep);

    notes.push(
      new vexFlow.TabNote({
        positions: event.notes.map((note) => ({
          str: note.string,
          fret: note.fret,
        })),
        duration: getVexFlowDuration(event.duration),
      }),
    );

    cursorStep = Math.max(cursorStep, event.step + getDurationSteps(event.duration));
  });

  appendGhostNotes(vexFlow, notes, totalSteps - cursorStep);

  return notes;
}

function appendGhostNotes(
  vexFlow: VexFlowApi,
  notes: VexFlowTabNote[],
  stepCount: number,
) {
  let remainingSteps = Math.max(0, stepCount);

  while (remainingSteps > 0) {
    if (remainingSteps >= 4) {
      notes.push(new vexFlow.GhostNote("q"));
      remainingSteps -= 4;
    } else if (remainingSteps >= 2) {
      notes.push(new vexFlow.GhostNote("8"));
      remainingSteps -= 2;
    } else {
      notes.push(new vexFlow.GhostNote("16"));
      remainingSteps -= 1;
    }
  }
}

function getVexFlowDuration(duration: TabDuration) {
  switch (duration) {
    case "quarter":
      return "q";
    case "eighth":
      return "8";
    case "sixteenth":
      return "16";
  }
}

function getDurationSteps(duration: TabDuration) {
  switch (duration) {
    case "quarter":
      return 4;
    case "eighth":
      return 2;
    case "sixteenth":
      return 1;
  }
}

export default VexFlowTabNotation;
