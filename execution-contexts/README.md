# JavaScript Execution Contexts — Deep Dive

> In‑depth explanation of execution contexts, what happens behind the scenes, the two phases (creation & execution), global execution context, lexical & variable environments, realms, hoisting, TDZ, memory allocation, and practical examples.

---

## Table of Contents

1. [High-level overview](#high-level-overview)
2. [What is an Execution Context?](#what-is-an-execution-context)
3. [Types of Execution Contexts](#types-of-execution-contexts)
4. [Two Phases: Creation (Setup) & Execution (Run)](#two-phases-creation-setup--execution-run)

   * [Creation phase: detailed steps](#creation-phase-detailed-steps)
   * [Execution phase: detailed steps](#execution-phase-detailed-steps)
5. [Global Execution Context (GEC)](#global-execution-context-gec)
6. [Lexical Environment vs Variable Environment](#lexical-environment-vs-variable-environment)

   * [Environment Record types](#environment-record-types)
   * [Scope chain & outer environment reference](#scope-chain--outer-environment-reference)
7. [Realms (Intrinsics, Global Object, Global Environment Record)](#realms-intrinsics-global-object-global-environment-record)
8. [Memory allocation but no value yet (uninitialized bindings)](#memory-allocation-but-no-value-yet-uninitialized-bindings)
9. [Hoisting — what actually moves?](#hoisting---what-actually-moves)
10. [Temporal Dead Zone (TDZ)](#temporal-dead-zone-tdz)
11. [Closures, GC, and why environment records stay alive](#closures-gc-and-why-environment-records-stay-alive)
12. [Common pitfalls & gotchas](#common-pitfalls--gotchas)
13. [Debugging tips and checklist](#debugging-tips-and-checklist)
14. [Examples — runnable code illustrating every idea](#examples---runnable-code-illustrating-every-idea)

---

## High-level overview

JavaScript executes code inside **execution contexts**. An execution context is like a running sandbox for a piece of code (global script, a function, or `eval`/module). Each context has its own set of bindings and a reference to an outer environment (the *scope chain*). The engine creates the context, prepares memory and bindings, then runs code.

---

## What is an Execution Context?

An execution context is an internal specification concept that packages:

* a **Lexical Environment** (where `let/const` and other lexical bindings live),
* a **Variable Environment** (used for `var` bindings historically),
* a **this** binding (the `this` value for the running code),
* references to the current **Realm** and other bookkeeping (like the environment chain).

It is pushed on the **Call Stack** when code runs and popped when the code finishes.

---

## Types of Execution Contexts

* **Global execution context (GEC)** — the top-level script of a realm (e.g., `window` script or module top-level). There is exactly one global context per realm.
* **Function execution context** — created each time a function is called.
* **Eval execution context** — created when `eval()` runs code (rare; and often discouraged).
* **Module execution context** — ES modules have their own semantics (e.g., top-level `await`, modules are always strict-mode).

Note: arrow functions do **not** create their own `this` binding — they use the surrounding `this`.

---

## Two Phases: Creation (Setup) & Execution (Run)

Every execution context goes through two main phases:

1. **Creation phase** (also called the "variable instantiation" phase in many articles)
2. **Execution phase** (the code actually runs line by line)

### Creation phase — detailed steps

When the engine creates a context (global or function call) it performs roughly these steps:

1. **Create a fresh LexicalEnvironment and VariableEnvironment** (each is a pair: an *environment record* + an *outer* reference).
2. **Create bindings for parameters and declared identifiers**:

   * **Function declarations** → create function object and store it (fully initialized).
   * **`var` declarations** → create binding and initialize it to `undefined`.
   * **`let`/`const`/`class`/`function` (block) declarations** → create binding in the lexical environment but leave it *uninitialized* (TDZ applies).
   * **Parameters** → create parameter bindings and assign values passed by the call.
3. **Create the `arguments` object** (for non‑strict functions — note: spec details differ for strict mode and modern engines).
4. **Establish `this` binding** for the execution context (value depends on call site and whether `call`/`apply`/`bind` used).
5. **Link the outer environment** (scope chain) — sets where `[[Outer]]` points.
6. **Allocate memory** for bindings (some bindings exist but have no value yet — e.g., `let x;` binding is created but uninitialized).

> Important: many people say “hoisting” means code moves. That’s a simplification: *declarations are recorded during creation*. The *executable initializers* (expressions on right-hand side) still run during the execution phase in order.

### Execution phase — detailed steps

Once the creation phase is complete, the engine executes code top-to-bottom:

* Evaluate expressions and assignments — initializing `let/const` values when their declaration is executed.
* Run function bodies, loops, conditionals, etc.
* If a `return` or exception occurs, resolve the context accordingly and pop it off the call stack.
* After completion, if closures reference variables from this environment, the environment record remains reachable and is not garbage collected.

---

## Global Execution Context (GEC)

The GEC is created when a realm evaluates top-level script. Steps include:

1. Create a **Global Object** (e.g., `window` in a browser) and a **Global Environment Record**.
2. Install global `var` bindings as properties of the global object (historical behavior).
3. Install global function declarations as properties too (but modules differ: top-level `var` bindings are not created in the same manner for modules).
4. Execute the script in the global lexical environment.

Note: In modules, top-level bindings are *module-scoped*, not automatically properties of the global object.

---

## Lexical Environment vs Variable Environment

* **LexicalEnvironment**: where block-scoped declarations (`let`, `const`, functions declared in blocks) are stored. It is the environment used for resolve of identifiers via lexical scope.
* **VariableEnvironment**: historically used by the spec to hold function-scoped `var` declarations and parameters. Practically it's another environment record.

Both are composed of:

* an **Environment Record** (object storing actual bindings), and
* a `[[Outer]]` pointer to the parent environment.

### Environment Record types

* **DeclarativeEnvironmentRecord** — stores `let`, `const`, function parameters, and per-function local `let`/`const`/`var` (depending on the engine's internal arrangement).
* **ObjectEnvironmentRecord** — binds an object (like the global object) as the record — used for the global environment so `window.x` and `var x` can be the same property.

### Scope chain & outer reference

When resolving an identifier, the engine checks the current environment record; if not found, it follows `[[Outer]]` to the parent and so on until the global environment. If not found anywhere, a `ReferenceError` happens at access time.

---

## Realms (Intrinsics, Global Object, Global Environment Record)

A **Realm** is the execution context for the whole JS environment (per global object). It contains:

* **Intrinsics**: the built-in standard objects (`Object.prototype`, `Array.prototype`, `Promise`, `%ThrowTypeError%`, etc.).
* **Global Object**: `window`/`globalThis` — the top-level object.
* **Global Environment Record**: the record that maps global identifiers and links to the global object.

Each iframe or worker has its own realm (own intrinsics and global object). Cross‑realm interaction has special rules (e.g., `Array` instances from different realms still work but their prototypes are different).

---

## Memory allocation but no value yet — uninitialized bindings

During the creation phase the engine **allocates a binding slot** for declared names.

* For `var x;` the slot is created and initialized to `undefined` immediately.
* For `let x;` and `const x = ...;` the slot is created but left **uninitialized** until the execution phase reaches the declaration; accessing it during this interval triggers the TDZ behavior.

This is why `var` variables log `undefined` when accessed before declaration, while `let/const` throw a `ReferenceError`.

---

## Hoisting — what actually moves?

Common phrasing: *"Declarations are hoisted"*. Precise explanation:

* **Function declarations** are available in the creation phase as fully initialized function objects — you can call them before their textual position.
* **`var` declarations** create a binding in the creation phase and initialize it to `undefined`.
* **`let` / `const` / `class`** declarations create a binding but not a value — they are in a *temporal dead zone* until the execution phase runs the binding's initialization.

Example (see examples section for runnable version):

```js
console.log(foo()); // works because function declaration hoisted
function foo(){ return 'hi'; }

console.log(x); // undefined (var hoisted)
var x = 10;

console.log(y); // ReferenceError — y is in TDZ
let y = 20;
```

---

## Temporal Dead Zone (TDZ)

**TDZ** is the time between entering a scope and the point where a `let`/`const` binding is initialized. During TDZ, accessing or even referencing the binding throws a `ReferenceError`.

Important consequences:

* `let`/`const` help catch errors earlier (no silent `undefined`).
* The TDZ exists per binding, not per lexical name — two `let` bindings with the same name in different blocks are independent.

---

## Closures, GC, and why environment records stay alive

If an inner function references variables in an outer environment, the engine retains that environment record so those bindings remain reachable even after the outer function returns.

This is how closures work:

```js
function makeCounter() {
  let count = 0; // stored in the environment record
  return function () { // inner function closes over count
    count += 1;
    return count;
  };
}
const c = makeCounter();
console.log(c()); // 1
console.log(c()); // 2
```

Because `c` (the returned function) references `count`, the `count` binding cannot be garbage-collected — the environment record is kept alive.

Engines optimize memory; they do not keep the entire call stack, only the reachable environment records.

---

## Common pitfalls & gotchas

* **Expecting hoisted `let` to behave like `var`** → TDZ prevents this.
* **Assuming `this` inside arrow functions is own `this`** → arrow functions use the lexical `this`.
* **Mutating objects referenced by outer scope** → closures capture references, not copies.
* **Using `var` in loops with async callbacks** — `var` is function-scoped, leading to classic loop closure bugs; prefer `let`.

---

## Debugging tips and checklist

* Use DevTools: inspect scopes in the Sources/Debugger tab to see environment records and closure contents.
* Put `console.log` at the top of functions to show creation vs execution.
* Use `/* strict */ 'use strict'` at top of functions or modules to avoid subtle non-strict behavior.
* Watch for TDZ `ReferenceError` messages — they are signals you are accessing lexical bindings too early.

---

## Examples — runnable code illustrating every idea

Below are carefully commented examples. Paste them into a browser console or Node REPL (note: `window`/`global` differences in Node) to observe behavior.

### Example 1 — Creation vs Execution phases, hoisting

```js
// Creation phase effects
console.log('call foo before declaration ->', typeof foo); // 'function' (hoisted)
console.log('access vVar before declaration ->', vVar); // undefined (var hoisted)
try { console.log('access vLet before declaration ->', vLet); } catch (e) { console.log('vLet TDZ error ->', e.name); }

function foo() {
  return 'I am a hoisted function';
}
var vVar = 1;
let vLet = 2;
```

**Expected logs:**

```
call foo before declaration -> function
access vVar before declaration -> undefined
vLet TDZ error -> ReferenceError
```

Explanation: function declaration and `var` binding appear during the creation phase. `let` binding exists but is uninitialized (TDZ) until the `let vLet = 2` line executes.

---

### Example 2 — TDZ and block scope

```js
{
  // new lexical environment for this block
  try { console.log(blockLet); } catch (e) { console.log('blockLet TDZ ->', e.message); }
  let blockLet = 'hello';
  console.log('after init blockLet ->', blockLet);
}
```

**Expected:** first access throws `ReferenceError`, second logs `hello`.

---

### Example 3 — var vs let in loops (classic closure pitfall)

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var i ->', i), 10);
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let j ->', j), 20);
}
```

**Expected output:**

```
var i -> 3
var i -> 3
var i -> 3
let j -> 0
let j -> 1
let j -> 2
```

Explanation: `var` is function-scoped; by the time the callbacks run `i` is `3`. `let` creates a fresh binding on each loop iteration.

---

### Example 4 — Function execution context specifics (parameters, arguments, this)

```js
function f(a, b) {
  console.log('arguments[0] ->', arguments[0]);
  console.log('param a ->', a);
  this.x = 10; // depends on call site
}

f.call({ }, 1, 2); // arguments object available (non-strict)
```

Note: in strict mode, `arguments` and parameter aliasing behaves differently.

---

### Example 5 — Closures & environment retention (memory)

```js
function makeAdder(x) {
  return function (y) {
    return x + y; // x lives in the outer environment record
  };
}
const add5 = makeAdder(5);
console.log(add5(2)); // 7 — `x` (5) kept alive by closure
```

---

### Example 6 — Realms (conceptual)

Open a console in the main page and an iframe and compare constructors:

```js
// main page
console.log(Array === iframe.contentWindow.Array); // false — different realms
```

Realms have separate intrinsics; objects from different realms carry different prototypes.

---

### Example 7 — ObjectEnvironmentRecord & global properties

```js
var g = 1; // creates property on global object (non-module script)
console.log(window.g === 1); // true in browsers
let gg = 2; // not a property of global object in the same way
console.log(window.gg); // undefined
```

---

## Final notes & best practices

* Prefer `let`/`const` for predictable scoping and to avoid `var` pitfalls.
* Understand TDZ — it prevents a class of bugs where `undefined` would silently propagate.
* Remember: *declarations are recorded during creation*, but *initializers run during execution*.
* Use closures deliberately, but be mindful of memory retention.
* Learn to read the DevTools scope inspector — it visualizes the LexicalEnvironment and helps debug.

---

### Quick checklist

* [ ] Know that each function call creates a new execution context
* [ ] Use `let`/`const` to avoid surprises from `var`
* [ ] Expect function declarations to be usable before their textual location
* [ ] Avoid accessing `let`/`const` before initialization (TDZ)
* [ ] Use DevTools to inspect environment records and closures

---
