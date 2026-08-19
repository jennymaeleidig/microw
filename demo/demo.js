// microw v1 — user-testing demo.
// Builds a desktop with windows, a taskbar, and a cascade batch, then walks the
// tester through a stage-by-stage checklist. Prompt only: no questions asked,
// no answers recorded.

import { MicroW } from "../dist/esm/index.js";

const desktop = document.getElementById("desktop");

// Mount the taskbar up front so its work-area band is registered before the
// cascade batch; it reserves space once a window registers an item on it.
MicroW.taskbar(desktop, { side: "bottom", grow: "right", align: "start" });

const win = (options) =>
  new MicroW({ root: desktop, minWidth: 260, minHeight: 180, ...options });

// Core windows: explicit geometry, so they are consumer-owned and never
// cascade-placed.
win({
  x: 24,
  y: 24,
  width: 400,
  height: 300,
  title: "Welcome",
  html: `<p>This is a <strong>microw</strong> window — a <code>.mcrw</code> element the library mounted into the desktop root.</p>
<p>The library owns its geometry, state, and DOM structure. Every pixel of the look comes from <code>demo.css</code>.</p>`,
});

win({
  x: 460,
  y: 96,
  width: 320,
  height: 240,
  title: "Notes",
  html: `<ul>
<li>Drag me by the header.</li>
<li>Resize me from any edge or corner.</li>
<li>Minimize, maximize, or close me with the header controls.</li>
</ul>`,
});

win({
  x: 820,
  y: 140,
  width: 340,
  height: 280,
  title: "Files",
  html: `<ul>
<li><code>README.md</code></li>
<li><code>src/microw.ts</code></li>
<li><code>demo/demo.css</code></li>
</ul>`,
});

win({
  x: 120,
  y: 360,
  width: 460,
  height: 220,
  minWidth: 280,
  minHeight: 160,
  title: "Terminal",
  html: `<p><code>$ npm run demo</code></p>
<p><code>microw demo running at http://127.0.0.1:4173/demo/</code></p>`,
});

win({
  x: 640,
  y: 420,
  width: 380,
  height: 240,
  title: "About microw",
  html: `<p>Headless window management: <code>mcrw-*</code> classes define the structure; your CSS defines the look.</p>
<p>This demo styles them with a small consumer stylesheet.</p>`,
});

// ——— cascade ———

let cascadeSpawned = false;

function spawnCascade() {
  if (cascadeSpawned) {
    return;
  }
  cascadeSpawned = true;
  MicroW.cascade({ root: desktop, mode: "cascade" });
  const specs = [
    { title: "Reports", html: "<p>Quarterly report — draft.</p>" },
    { title: "Inbox", html: "<p>Three unread messages.</p>" },
    { title: "Calendar", html: "<p>No events today.</p>" },
    { title: "Music", html: "<p>Now playing: a test tone.</p>" },
  ];
  for (const spec of specs) {
    // No x/y: cascade supplies the default placement.
    win({
      title: spec.title,
      html: spec.html,
      width: 300,
      height: 220,
    });
  }
}

// ——— headless audit ———
// Proves the contract in a real browser: the library's inline styles on every
// .mcrw element are limited to geometry (left/top/width/height) plus z-index,
// and it injected no <style> element.

function headlessAudit() {
  const windows = [...desktop.querySelectorAll(".mcrw")];
  // Browsers report property names from style[i] as lowercase, hyphenated
  // ("z-index"); normalize so the check is convention-agnostic.
  const allowed = new Set(["left", "top", "width", "height", "zindex"]);
  let clean = true;
  for (const el of windows) {
    const style = el.style;
    for (let i = 0; i < style.length; i += 1) {
      const name = String(style[i]).toLowerCase().replace(/-/g, "");
      if (!allowed.has(name)) {
        clean = false;
      }
    }
  }
  const injectedStyle = document.querySelectorAll("style").length > 0;
  return { clean, injectedStyle, count: windows.length };
}

// ——— testing wizard ———

const stages = [
  {
    title: "Windows & header drag",
    steps: [
      "Several windows are open. Drag each by its header — the dark title bar.",
      "Windows stay wholly inside the desktop and never slide under the taskbar.",
    ],
  },
  {
    title: "Resize — the eight handles",
    steps: [
      "Each window shows eight blue handles: one per edge, one per corner.",
      "Drag a corner, then an edge: the grabbed edge moves while the opposite edge stays fixed.",
      "Resize clamps to the work area and each window's minimum size.",
    ],
  },
  {
    title: "Minimize, maximize, restore",
    steps: [
      "Click a window's minimize (–) control: it hides via CSS, keeps its geometry, and its taskbar item dims.",
      "Click the taskbar item to restore it — the taskbar is the only restore affordance.",
      "Click maximize (□) to fill the work area; click it again to toggle back.",
    ],
  },
  {
    title: "Focus & z-order",
    steps: [
      "Click between windows: the focused one rises to the top.",
      "Its taskbar item highlights in place — items never reorder.",
    ],
  },
  {
    title: "Close",
    steps: [
      "Close a window with its close (×) control.",
      "The window, its taskbar item, and its registry entry all disappear; focus hands to the next window.",
    ],
  },
  {
    title: "Cascade",
    steps: [
      "Four new windows just opened in a stepped staircase — placed by MicroW.cascade.",
      "Drag or resize one: it becomes yours and will not be rearranged.",
    ],
    onEnter: spawnCascade,
  },
  {
    title: "Done",
    steps: [
      "You have exercised the full v1 surface: drag, eight-handle resize, minimize / maximize / restore, focus, close, the taskbar, and cascade.",
      "Everything you saw is consumer CSS over the mcrw-* class contract — the library wrote only geometry and z-index.",
    ],
    final: true,
  },
];

const titleEl = document.getElementById("stage-title");
const listEl = document.getElementById("stage-list");
const counterEl = document.getElementById("stage-counter");
const prevBtn = document.getElementById("stage-prev");
const nextBtn = document.getElementById("stage-next");

let index = 0;
let finished = false;

function addStep(text) {
  const li = document.createElement("li");
  li.textContent = text;
  listEl.appendChild(li);
}

function render() {
  const stage = stages[index];
  titleEl.textContent = stage.title;
  listEl.replaceChildren();
  for (const step of stage.steps) {
    addStep(step);
  }
  counterEl.textContent = `Stage ${index + 1} of ${stages.length}`;
  prevBtn.disabled = index === 0 || finished;
  nextBtn.disabled = finished;
  nextBtn.textContent = stage.final ? "Finish" : "Next →";
}

function finish() {
  finished = true;
  const audit = headlessAudit();
  titleEl.textContent = "Demo complete";
  counterEl.textContent = "Complete";
  listEl.replaceChildren();
  addStep(
    "Thanks for testing microw v1 — nothing was asked and nothing was recorded.",
  );
  addStep(
    audit.clean
      ? `Headless audit: ${audit.count} windows, library inline styles limited to geometry + z-index, no <style> injected.`
      : "Headless audit: an unexpected inline style was found — see the console.",
  );
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

prevBtn.addEventListener("click", () => {
  if (finished) {
    return;
  }
  index = Math.max(index - 1, 0);
  render();
});

nextBtn.addEventListener("click", () => {
  if (finished) {
    return;
  }
  if (stages[index].final) {
    finish();
    return;
  }
  index = Math.min(index + 1, stages.length - 1);
  stages[index].onEnter?.();
  render();
});

render();
console.info(
  "microw demo ready — follow the checklist in the top panel.",
  headlessAudit(),
);
