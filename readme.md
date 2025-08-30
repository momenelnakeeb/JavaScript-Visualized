# JavaScript Concurrency — Event Loop, Web APIs, Task & Microtask Queues, and the JS Engine

> A deep, practical README with runnable examples and best practices for writing non‑blocking JavaScript.

## Table of Contents

1. [What Problem Are We Solving?](#what-problem-are-we-solving)
2. [The JavaScript Engine: Call Stack & Heap](#the-javascript-engine-call-stack--heap)
3. [Web APIs / Host APIs](#web-apis--host-apis)
4. [Queues & Scheduling](#queues--scheduling)

   * [Task (Macrotask) Queue](#task-macrotask-queue)
   * [Microtask Queue](#microtask-queue)
   * [Priority Between Queues](#priority-between-queues)
5. [The Event Loop](#the-event-loop)

   * [High-Level Algorithm](#high-level-algorithm)
   * [Event Loop + Task Queue (All Situations)](#event-loop--task-queue-all-situations)
   * [Event Loop + Microtask Queue (All Situations)](#event-loop--microtask-queue-all-situations)
6. [Promises Deep Dive](#promises-deep-dive)

   * [States, Result, Reactions](#states-result-reactions)
   * [How Promise Callbacks Are Scheduled](#how-promise-callbacks-are-scheduled)
7. [Avoiding Frozen Programs (Long Tasks)](#avoiding-frozen-programs-long-tasks)

   * [Patterns to Break Up Work](#patterns-to-break-up-work)
   * [Best Practices & Gotchas](#best-practices--gotchas)
8. [Code Examples](#code-examples)

   * [E1: Basic Ordering — sync vs microtasks vs tasks](#e1-basic-ordering--sync-vs-microtasks-vs-tasks)
   * [E2: setTimeout vs setInterval vs setImmediate](#e2-settimeout-vs-setinterval-vs-setimmediate)
   * [E3: Promise chains & error handling](#e3-promise-chains--error-handling)
   * [E4: fetch() and microtask timing](#e4-fetch-and-microtask-timing)
   * [E5: queueMicrotask and starvation](#e5-queuemicrotask-and-starvation)
   * [E6: Breaking up a CPU-heavy task](#e6-breaking-up-a-cpu-heavy-task)
   * [E7: requestAnimationFrame and rendering](#e7-requestanimationframe-and-rendering)
   * [E8: One big “who runs first?” script](#e8-one-big-who-runs-first-script)
9. [Browser vs Node.js Differences](#browser-vs-nodejs-differences)
10. [FAQ](#faq)
11. [Checklist](#checklist)

---

## What Problem Are We Solving?

JavaScript is **single‑threaded** at its core: it has **one Call Stack** and executes **one thing at a time**. Long‑running work on the Call Stack blocks everything (UI freezes, missed frames, delayed input). To keep apps responsive, JS runtimes provide **Web/Host APIs**, **queues**, and the **Event Loop** that enable **asynchronous, non‑blocking** execution.

Key realities:

* **JS is single‑threaded** → one Call Stack only.
* **JS handles a single task at a time**; parallelism comes from the host (browser/Node) and background systems.
* The **Event Loop** is a **small runtime component** that coordinates what runs next.
* **Avoid frozen programs** by never monopolizing the Call Stack for too long.

---

## The JavaScript Engine: Call Stack & Heap

```
+--------------------+
|        Heap        |  ← Objects live here (allocated, referenced)
+--------------------+
|     Call Stack     |  ← Frames: main() → fnA() → fnB() ...
+--------------------+
```

* **Call Stack**: where function frames execute. If it’s busy, nothing else runs.
* **Heap**: memory for objects/closures/functions. GC frees unreachable memory.

> The engine itself **does not** provide timers, I/O, networking, etc. Those live in the host (browser/Node) as **Web APIs / Host APIs**.

---

## Web APIs / Host APIs

**Web APIs** (browsers) and **Host APIs** (Node.js) run work **off the Call Stack**, e.g.:

* **Timers**: `setTimeout`, `setInterval` (browser & Node), `setImmediate` (Node)
* **Network**: `fetch` (browser & modern Node), XHR, sockets (Node)
* **DOM**: events, `MutationObserver`
* **Task helpers**: `MessageChannel`, `queueMicrotask`
* **Animation/Scheduling**: `requestAnimationFrame`, `requestIdleCallback` (browser)
* **I/O**: filesystem/net (Node)

These APIs queue callbacks to be later executed by the runtime.

---

## Queues & Scheduling

### Task (Macrotask) Queue

Holds **tasks/macrotasks** like:

* `setTimeout`, `setInterval`, `setImmediate` (Node)
* DOM events (click, input), network events, message events
* Some I/O completions

**When are tasks run?** After the current stack finishes and **after microtasks are drained** for the current tick.

### Microtask Queue

Holds shorter, higher‑priority jobs:

* **Promise reactions** (`.then/.catch/.finally`)
* **`queueMicrotask`** callbacks
* **`MutationObserver`** callbacks

**When are microtasks run?** After each task completes **and** after synchronous code, the runtime **drains the microtask queue to completion** before the next task or render.

### Priority Between Queues

**Microtasks run before the next task.** This is why `Promise.resolve().then(...)` usually fires before `setTimeout(..., 0)`. Overusing microtasks can **starve** tasks (and rendering).

---

## The Event Loop

### High-Level Algorithm

1. If the **Call Stack** is empty, the Event Loop checks queues.
2. **Pick a Task (macrotask)** if available and push its callback on the stack.
3. When that task finishes (stack empty again), **drain the microtask queue** (run all microtasks; newly queued microtasks during draining are appended and also drained until empty).
4. In browsers, potentially **render a frame**.
5. Repeat.

### Event Loop + Task Queue (All Situations)

* Multiple tasks queue up (timers, I/O, UI). They are processed one by one across ticks.
* If a task takes long synchronously, everything else waits (delays input/rendering).

### Event Loop + Microtask Queue (All Situations)

* After each task or after sync code, microtasks are run to completion.
* If you recursively schedule microtasks, you can **starve** the loop; nothing else (including rendering) proceeds.

---

## Promises Deep Dive

### States, Result, Reactions

A `Promise` is an object with **state** and **result**:

* **States**: `pending` → `fulfilled` *or* `rejected` (settled)
* **Result**: fulfillment value or rejection reason
* **Reactions**: functions registered via `.then`, `.catch`, `.finally`

**Creation → Settlement → Reaction queueing → Reaction execution**

* When a promise settles, its reactions are **enqueued as microtasks**.
* Each reaction runs in a microtask turn, producing a new promise in the chain.

### How Promise Callbacks Are Scheduled

* `.then/.catch/.finally` callbacks **never** run inline; they run in a **future microtask**.
* `await` is syntax sugar for promises; after an `await`, the remainder of the async function resumes in a **microtask**.

---

## Avoiding Frozen Programs (Long Tasks)

Long tasks (> 50ms on the main thread) cause jank/freezes. Break them up.

### Patterns to Break Up Work

* **Chunking** with `setTimeout(fn, 0)` or `queueMicrotask` (careful with starvation)
* **`requestIdleCallback`** for low‑priority background work (browser)
* **`requestAnimationFrame`** to coordinate with paint (browser)
* **Web Workers / Worker Threads** for CPU‑heavy work off the main thread
* **Streaming** (e.g., `ReadableStream`) for I/O so UI remains responsive

### Best Practices & Gotchas

* Don’t spin on the Call Stack (e.g., `while(true){}`) — you’ll freeze everything.
* Don’t create **infinite microtask loops** (`queueMicrotask`/Promise chains) — you’ll starve tasks and rendering.
* Use **backpressure** and cancellation for repeated tasks (`AbortController`, clear timers/intervals).
* Prefer **microtasks** for small follow‑ups and **tasks** for UI/event boundary work.

---

## Code Examples

All examples log a **numbered timeline** so you can see what runs first.

> Tip: In Node, run with a recent version. In browsers, paste into DevTools Console. Replace `setImmediate` with `MessageChannel` pattern in browsers if needed.

### E1: Basic Ordering — sync vs microtasks vs tasks

```js
console.log('1) sync start');

setTimeout(() => console.log('6) task: setTimeout 0'), 0);

queueMicrotask(() => console.log('3) microtask: queueMicrotask'));

Promise.resolve()
  .then(() => console.log('2) microtask: Promise.then'))
  .then(() => console.log('4) microtask: Promise.then chain'))
  .finally(() => console.log('5) microtask: Promise.finally'));

console.log('7) sync end');
```

**Typical order (browser/Node):**

```
1) sync start
7) sync end
2) microtask: Promise.then
4) microtask: Promise.then chain
5) microtask: Promise.finally
3) microtask: queueMicrotask
6) task: setTimeout 0
```

> Microtasks run **before** the next task. All microtasks drain before `setTimeout`.

---

### E2: setTimeout vs setInterval vs setImmediate

**Node.js** (has `setImmediate`):

```js
setTimeout(() => console.log('task: setTimeout 0'), 0);
setImmediate(() => console.log('task: setImmediate'));

// I/O boundary often affects ordering; after I/O, setImmediate may win.
require('fs').readFile(__filename, () => {
  setTimeout(() => console.log('I/O → setTimeout 0'), 0);
  setImmediate(() => console.log('I/O → setImmediate'));
});

let n = 0;
const id = setInterval(() => {
  n++;
  console.log('interval tick', n);
  if (n === 3) clearInterval(id);
}, 0);
```

**Browser equivalent (no setImmediate):** use `MessageChannel` as a task:

```js
const channel = new MessageChannel();
channel.port1.onmessage = () => console.log('task: MessageChannel');
channel.port2.postMessage(null);
setTimeout(() => console.log('task: setTimeout 0'), 0);
```

---

### E3: Promise chains & error handling

```js
Promise.resolve('A')
  .then(v => { console.log('then 1:', v); return v + 'B'; })
  .then(v => { console.log('then 2:', v); throw new Error('boom'); })
  .catch(e => { console.log('catch:', e.message); return 'recovered'; })
  .finally(() => console.log('finally'))
  .then(v => console.log('then 3:', v));
```

**Key points:** each step is a **microtask**; errors skip to the nearest `catch` as another microtask.

---

### E4: `fetch()` and microtask timing

```js
console.log('sync start');

fetch('https://example.com')
  .then(() => console.log('microtask: fetch then #1'))
  .then(() => console.log('microtask: fetch then #2'))
  .catch(err => console.log('microtask: fetch catch', err))
  .finally(() => console.log('microtask: fetch finally'));

console.log('sync end');
```

**Flow:** network happens off-thread (Web API). Once completed, promise settles → reactions queued as **microtasks**, which run **before** the next task.

---

### E5: `queueMicrotask` and starvation

```js
let count = 0;
function bad() {
  queueMicrotask(() => {
    count++;
    if (count % 1000 === 0) console.log('still microtasking…', count);
    bad(); // ← Infinite microtask loop → starves tasks & rendering
  });
}
// bad(); // ⚠️ Don’t run this — it can freeze the tab/process.

// ✅ Safer: yield to tasks occasionally
let c = 0;
function better() {
  queueMicrotask(() => {
    c++;
    if (c % 1000 === 0) console.log('microtasks so far:', c);
    if (c % 5000 === 0) {
      setTimeout(better, 0); // yield to a task so others can run
    } else {
      better();
    }
  });
}
// better(); // ← Demonstrates yielding.
```

**Lesson:** Draining microtasks forever prevents timers, input, and paints from running.

---

### E6: Breaking up a CPU-heavy task

```js
// Naive: blocks UI for a long time
function sumNaive(N) {
  let s = 0; for (let i = 0; i < N; i++) s += i; return s;
}

// Better: chunk using tasks (keeps UI responsive)
function sumChunked(N, chunk = 50_000) {
  return new Promise(resolve => {
    let i = 0, s = 0;
    function run() {
      const end = Math.min(i + chunk, N);
      for (; i < end; i++) s += i;
      if (i < N) setTimeout(run, 0); // yield to event loop
      else resolve(s);
    }
    run();
  });
}

// Even better (browser): align with frames
function sumWithRAF(N, chunk = 100_000) {
  return new Promise(resolve => {
    let i = 0, s = 0;
    function frame() {
      const end = Math.min(i + chunk, N);
      for (; i < end; i++) s += i;
      if (i < N) requestAnimationFrame(frame);
      else resolve(s);
    }
    requestAnimationFrame(frame);
  });
}

// Usage:
(async () => {
  console.time('chunked');
  const total = await sumChunked(5_000_000);
  console.timeEnd('chunked');
  console.log('sum =', total);
})();
```

---

### E7: `requestAnimationFrame` and rendering

```js
// In the browser, rAF callbacks run before the next paint.
requestAnimationFrame(() => {
  // Apply DOM changes here for smooth 60fps updates
  console.log('rAF: before paint');

  // Schedule a microtask that will run before the *next* task
  Promise.resolve().then(() => console.log('microtask after rAF'));
});

setTimeout(() => console.log('task after rAF'), 0);
```

**Order (typical):** rAF callback → its microtasks → next task (`setTimeout`).

---

### E8: One big “who runs first?” script

This puts **everything together**. Observe the actual order in your environment.

```js
console.log('A) sync start');

setTimeout(() => console.log('H) task: setTimeout 0'), 0);

Promise.resolve()
  .then(() => console.log('C) microtask: Promise.then #1'))
  .then(() => console.log('E) microtask: Promise.then #2'))
  .finally(() => console.log('F) microtask: Promise.finally'));

queueMicrotask(() => console.log('D) microtask: queueMicrotask'));

if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(() => {
    console.log('G) rAF: before paint');
    Promise.resolve().then(() => console.log('G1) microtask inside rAF'));
  });
}

// Browser-only task via MessageChannel
if (typeof MessageChannel !== 'undefined') {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => console.log('I) task: MessageChannel');
  ch.port2.postMessage(null);
}

console.log('B) sync end');
```

**You’ll typically see:**

1. Sync logs `A`, `B`
2. Microtasks `C`, `E`, `F`, `D`
3. rAF `G` (before paint), then its microtask `G1`
4. Tasks `H`, `I` (ordering of task kinds may vary by environment)

---

## Browser vs Node.js Differences

* **`setImmediate`**: Node‑only task that often runs **after I/O** callbacks more predictably than `setTimeout(0)`.
* **`process.nextTick` (Node)**: runs **before** other microtasks; use sparingly to avoid starvation. Do **not** create unbounded `nextTick` loops.
* **Timers/I/O** phases\*\* (Node)\*\*: Node’s event loop has observable phases (timers, pending, poll, check, close). This can affect ordering between `setTimeout` and `setImmediate`.
* **Rendering hooks** (`requestAnimationFrame`, `requestIdleCallback`) are **browser** features.

---

## FAQ

**Q: Why is my `setTimeout(fn, 0)` delayed?**
Because microtasks must drain first, and other tasks may be queued ahead. Browsers also clamp very small timeouts.

**Q: Why did my UI freeze?**
You kept the Call Stack busy too long (sync loops, heavy computation, unbounded microtasks). Break work into chunks or move it off‑thread.

**Q: Should I prefer microtasks or tasks?**

* **Microtasks** for quick follow‑ups and promise continuation logic.
* **Tasks** for boundaries around user events, timers, and to allow rendering/input between steps.

**Q: Are Promises synchronous?**
Creating a promise runs its executor synchronously, but `.then/.catch/.finally` callbacks always run in a **future microtask**.

---

## Checklist

* [ ] Keep the Call Stack short; avoid long synchronous loops
* [ ] Use microtasks for small, immediate follow‑ups
* [ ] Use tasks to yield back to the loop and let rendering/input proceed
* [ ] Don’t create infinite microtask/`nextTick` loops
* [ ] For heavy CPU work, chunk or offload to workers
* [ ] Measure with DevTools (Performance panel, Long Tasks)

---

### Appendix: Minimal polyfills & utilities

```js
// queueMicrotask polyfill (very old browsers)
window.queueMicrotask ||= cb => Promise.resolve().then(cb);

// Yield back to the event loop in async functions
async function microYield() { await Promise.resolve(); }
function taskYield() { return new Promise(r => setTimeout(r, 0)); }
function frameYield() { return new Promise(r => requestAnimationFrame(r)); }
```

> With these building blocks, you can reason about **which callback runs first**, avoid freezes, and design responsive apps that leverage the Event Loop effectively.
