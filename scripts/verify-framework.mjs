// Framework sanity check: a microw window survives a React re-render /
// change-detection pass untouched, because the library owns only its own DOM
// and state while React reconciles over a separate subtree.
//
// The pattern exercised here is the supported one: the consumer gives microw a
// ref-managed node that React renders once and never reconciles over; React
// owns the siblings. After repeated re-renders the `.mcrw` element is the same
// object, its structure is intact, and the window is still functional.

import { JSDOM } from "jsdom";
import { act, createElement, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const dom = new JSDOM(
  `<!doctype html><html><body><div id="app"></div></body></html>`,
  { url: "http://localhost/", pretendToBeVisual: true },
);

for (const [key, value] of [
  ["window", dom.window],
  ["document", dom.window.document],
  ["navigator", dom.window.navigator],
]) {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

// React's act() and microw's root observation need a couple of test doubles
// that jsdom does not provide (jsdom has no ResizeObserver). The framework
// check only needs construction to succeed, so a no-op observer is enough.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { MicroW } = await import("../dist/esm/index.js");

let desktopElement = null;
let createdWindow = null;
let bump = () => {};

function App() {
  const desktopRef = useRef(null);
  const [count, setCount] = useState(0);
  bump = () => setCount((value) => value + 1);
  useEffect(() => {
    desktopElement = desktopRef.current;
    createdWindow = new MicroW({ root: desktopRef.current, title: "React" });
  }, []);
  return createElement(
    "div",
    null,
    createElement("div", { ref: desktopRef, className: "desktop" }),
    createElement("span", { className: "ticker" }, `renders: ${count}`),
  );
}

const container = document.getElementById("app");
const root = createRoot(container);
await act(async () => {
  await root.render(createElement(App));
});

if (desktopElement === null || createdWindow === null) {
  throw new Error("framework: MicroW was not created by the effect");
}

const assertIntact = (label) => {
  const mounted = desktopElement.querySelector(".mcrw");
  if (mounted !== createdWindow.element) {
    throw new Error(
      `${label}: the .mcrw element was replaced across a re-render`,
    );
  }
  for (const selector of [
    ".mcrw-header",
    ".mcrw-title",
    ".mcrw-body",
    ".mcrw-btn-min",
    ".mcrw-btn-max",
    ".mcrw-btn-close",
    ".mcrw-resize-se",
  ]) {
    if (mounted.querySelector(selector) === null) {
      throw new Error(`${label}: ${selector} was stripped by the framework`);
    }
  }
  const state = createdWindow.getState();
  if (state.state !== "normal" || state.title !== "React") {
    throw new Error(`${label}: window state was disturbed (${state.state})`);
  }
};

assertIntact("initial render");

for (let i = 0; i < 5; i += 1) {
  await act(async () => {
    bump();
  });
  assertIntact(`re-render ${i + 1}`);
}

// The window remains fully functional after React reconciled around it.
createdWindow.maximize();
if (createdWindow.getState().state !== "max") {
  throw new Error("framework: window did not survive to a functional state");
}
createdWindow.restore();
assertIntact("post state-change");

await act(async () => {
  await root.unmount();
});

console.log("React re-renders left the microw window intact and functional");
