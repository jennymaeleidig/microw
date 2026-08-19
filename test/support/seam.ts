import { JSDOM } from "jsdom";
import type { DOMWindow } from "jsdom";

export interface Point {
  x: number;
  y: number;
}

export interface Layout extends Point {
  width: number;
  height: number;
  borderLeft?: number;
  borderTop?: number;
  clientWidth?: number;
  clientHeight?: number;
}

type Stub = Required<Layout>;

const zeroStub: Stub = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  borderLeft: 0,
  borderTop: 0,
  clientWidth: 0,
  clientHeight: 0,
};

const resolveStub = (layout: Layout): Stub => {
  const borderLeft = layout.borderLeft ?? 0;
  const borderTop = layout.borderTop ?? 0;
  return {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    borderLeft,
    borderTop,
    clientWidth: layout.clientWidth ?? layout.width - borderLeft * 2,
    clientHeight: layout.clientHeight ?? layout.height - borderTop * 2,
  };
};

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  readonly observed = new Set<Element>();
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  trigger(entryOf: (target: Element) => ResizeObserverEntry) {
    const entries = [...this.observed].map(entryOf);
    if (entries.length > 0) {
      this.callback(entries, this as unknown as ResizeObserver);
    }
  }
}

export interface Seam {
  window: DOMWindow;
  document: Document;
  setLayout(el: Element, layout: Layout): void;
  triggerResizeObserver(): void;
  fireWindowResize(): void;
  pointerDown(el: Element, point: Point): void;
  pointerMove(el: Element, point: Point): void;
  pointerUp(el: Element, point: Point): void;
  cleanup(): void;
}

export function createSeam(): Seam {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const win = dom.window as DOMWindow;
  const doc = win.document;
  const stubs = new WeakMap<Element, Stub>();

  const readStub = (el: Element): Stub => stubs.get(el) ?? zeroStub;

  const rectOf = (stub: Stub): DOMRect =>
    new win.DOMRect(stub.x, stub.y, stub.width, stub.height);

  win.HTMLElement.prototype.getBoundingClientRect = function () {
    return rectOf(readStub(this));
  };

  const defineClient = (prop: string, pick: (stub: Stub) => number) => {
    Object.defineProperty(win.HTMLElement.prototype, prop, {
      configurable: true,
      get(this: HTMLElement) {
        return pick(readStub(this));
      },
    });
  };

  defineClient("clientWidth", (s) => s.clientWidth);
  defineClient("clientHeight", (s) => s.clientHeight);
  defineClient("clientLeft", (s) => s.borderLeft);
  defineClient("clientTop", (s) => s.borderTop);

  const previous: Record<string, unknown> = {};
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "ResizeObserver"]) {
    previous[key] = g[key];
  }
  g.window = win as unknown as Window & typeof globalThis;
  g.document = doc;
  g.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

  const entryOf = (el: Element): ResizeObserverEntry => {
    const stub = readStub(el);
    return {
      target: el,
      contentRect: rectOf({
        ...zeroStub,
        x: stub.borderLeft,
        y: stub.borderTop,
        width: stub.clientWidth,
        height: stub.clientHeight,
      }),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry;
  };

  type PointerEventType = "pointerdown" | "pointermove" | "pointerup";

  const dispatchPointer = (
    type: PointerEventType,
    el: Element,
    point: Point,
  ) => {
    const event = new win.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: point.x,
      clientY: point.y,
      pointerId: 1,
      isPrimary: true,
      pointerType: "mouse",
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
    });
    el.dispatchEvent(event);
  };

  return {
    window: win,
    document: doc,
    setLayout(el: Element, layout: Layout) {
      stubs.set(el, resolveStub(layout));
    },
    triggerResizeObserver() {
      for (const instance of FakeResizeObserver.instances) {
        instance.trigger(entryOf);
      }
    },
    fireWindowResize() {
      win.dispatchEvent(new win.Event("resize"));
    },
    pointerDown(el: Element, point: Point) {
      dispatchPointer("pointerdown", el, point);
    },
    pointerMove(el: Element, point: Point) {
      dispatchPointer("pointermove", el, point);
    },
    pointerUp(el: Element, point: Point) {
      dispatchPointer("pointerup", el, point);
    },
    cleanup() {
      FakeResizeObserver.instances.length = 0;
      for (const key of ["window", "document", "ResizeObserver"]) {
        const value = previous[key];
        if (value === undefined) {
          delete g[key];
        } else {
          g[key] = value;
        }
      }
    },
  };
}
