# JavaScript Promises — A Deep Dive

> A comprehensive guide to understanding Promises in JavaScript, including execution model, internal mechanics, reaction records, states, and practical examples.

## Table of Contents

1. [What is a Promise?](#what-is-a-promise)
2. [Promise Execution in General](#promise-execution-in-general)
3. [Internal Structure of a Promise Object](#internal-structure-of-a-promise-object)

   * [State](#state)
   * [Result](#result)
   * [Fulfill and Reject Reactions](#fulfill-and-reject-reactions)
   * [PromiseIsHandled Flag](#promiseishandled-flag)
   * [Resolve and Reject Functions](#resolve-and-reject-functions)
4. [What is Special About Promises?](#what-is-special-about-promises)
5. [Promise Reaction Records](#promise-reaction-records)
6. [Promise Behavior in Different Situations](#promise-behavior-in-different-situations)

   * [Chaining](#chaining)
   * [Errors and Rejections](#errors-and-rejections)
   * [Promise.all, Promise.race, Promise.any, Promise.allSettled](#promiseall-promiserace-promiseany-promiseallsettled)
   * [Async/Await](#asyncawait)
7. [Why Promises are Non-Blocking](#why-promises-are-non-blocking)
8. [Detailed Code Examples](#detailed-code-examples)

   * [E1: Creating and Resolving a Promise](#e1-creating-and-resolving-a-promise)
   * [E2: Promise States and Transitions](#e2-promise-states-and-transitions)
   * [E3: Chaining Promises](#e3-chaining-promises)
   * [E4: Error Handling](#e4-error-handling)
   * [E5: Parallel Execution with Promise.all](#e5-parallel-execution-with-promiseall)
   * [E6: Racing Promises](#e6-racing-promises)
   * [E7: Using Async/Await](#e7-using-asyncawait)
   * [E8: Non-Blocking Nature of Promises](#e8-non-blocking-nature-of-promises)

---

## What is a Promise?

A **Promise** is a built-in JavaScript object that represents the eventual **completion** (fulfilled) or **failure** (rejected) of an asynchronous operation and its resulting value.

It provides a **clean abstraction** for async workflows, replacing callback hell with a chainable, composable API.

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('Hello, World!'), 1000);
});

promise.then(value => console.log(value)); // Logs "Hello, World!" after 1 second
```

---

## Promise Execution in General

* The **executor function** (passed to the `Promise` constructor) runs **synchronously** when the promise is created.
* It receives two functions: **`resolve`** and **`reject`**.
* When called:

  * `resolve(value)` → settles the promise as **fulfilled** with `value`.
  * `reject(reason)` → settles the promise as **rejected** with `reason`.
* After settlement, the promise becomes immutable (state cannot change again).

---

## Internal Structure of a Promise Object

When a new promise executes, a new object is allocated in memory. Internally, it contains:

### State

* `pending` (initial state)
* `fulfilled` (operation completed successfully)
* `rejected` (operation failed)

### Result

* The value provided on fulfillment
* Or the reason provided on rejection

### Fulfill and Reject Reactions

* Internal lists of functions (handlers) to call when the promise settles
* Registered via `.then`, `.catch`, `.finally`

### PromiseIsHandled Flag

* Internal boolean used to track if a rejection is handled
* Helps detect **unhandled rejections**

### Resolve and Reject Functions

* Unique functions tied to each promise instance
* Guarantee that only the first call matters (idempotent)

---

## What is Special About Promises?

* **Always asynchronous** for reaction callbacks: `.then/.catch/.finally` never run inline.
* **Composability**: Promises chain naturally.
* **Error propagation**: Errors bubble through the chain until caught.
* **Trustworthy state machine**: Once settled, never changes.
* **Integration with async/await**: Cleaner syntax for promise-based code.

---

## Promise Reaction Records

Internally, when you call `.then(onFulfilled, onRejected)`, the engine creates **reaction records**:

* A record is an object storing:

  * The reaction type (fulfill/reject)
  * The handler function
  * The capability to resolve the next promise in the chain

When the promise settles:

* Each reaction record is queued as a **microtask**.
* Reactions run one by one in order.

---

## Promise Behavior in Different Situations

### Chaining

```js
Promise.resolve(1)
  .then(v => v + 1)
  .then(v => v * 2)
  .then(v => console.log('Result:', v)); // 4
```

### Errors and Rejections

```js
Promise.resolve(1)
  .then(() => { throw new Error('Oops'); })
  .catch(err => console.error('Caught:', err.message))
  .finally(() => console.log('Cleanup'));
```

### `Promise.all`, `Promise.race`, `Promise.any`, `Promise.allSettled`

```js
Promise.all([
  Promise.resolve(1),
  Promise.resolve(2)
]).then(values => console.log('all:', values)); // [1, 2]

Promise.race([
  new Promise(r => setTimeout(() => r('slow'), 100)),
  Promise.resolve('fast')
]).then(value => console.log('race:', value)); // fast

Promise.any([
  Promise.reject('err'),
  Promise.resolve('ok')
]).then(value => console.log('any:', value)); // ok

Promise.allSettled([
  Promise.resolve('A'),
  Promise.reject('B')
]).then(results => console.log('allSettled:', results));
```

### Async/Await

```js
async function fetchData() {
  try {
    const res = await Promise.resolve('data');
    console.log(res);
  } catch (e) {
    console.error('Error:', e);
  }
}

fetchData();
```

---

## Why Promises are Non-Blocking

* When a promise settles, its reactions are enqueued in the **microtask queue**.
* Microtasks run **after** the current call stack is empty, but **before** the next task.
* This scheduling ensures promises don’t block synchronous code.

```js
console.log('sync start');

Promise.resolve().then(() => console.log('microtask: promise then'));

console.log('sync end');

// Logs:
// sync start
// sync end
// microtask: promise then
```

---

## Detailed Code Examples

### E1: Creating and Resolving a Promise

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 500);
});

p.then(v => console.log(v)); // 'done' after 0.5s
```

### E2: Promise States and Transitions

```js
let resolveFn;
const p = new Promise((resolve, reject) => {
  resolveFn = resolve;
});

console.log(p); // pending
resolveFn(42);
setTimeout(() => console.log(p), 0); // fulfilled with 42
```

### E3: Chaining Promises

```js
Promise.resolve(2)
  .then(v => v * 2)
  .then(v => v + 1)
  .then(v => console.log(v)); // 5
```

### E4: Error Handling

```js
Promise.resolve()
  .then(() => { throw new Error('fail'); })
  .catch(e => console.log('Caught:', e.message))
  .finally(() => console.log('Finally always runs'));
```

### E5: Parallel Execution with Promise.all

```js
async function runAll() {
  const [a, b, c] = await Promise.all([
    Promise.resolve(1),
    new Promise(r => setTimeout(() => r(2), 100)),
    Promise.resolve(3)
  ]);
  console.log(a, b, c); // 1 2 3
}

runAll();
```

### E6: Racing Promises

```js
Promise.race([
  new Promise(r => setTimeout(() => r('slow'), 200)),
  new Promise(r => setTimeout(() => r('fast'), 50))
]).then(console.log); // fast
```

### E7: Using Async/Await

```js
async function demo() {
  const val = await Promise.resolve('hello');
  console.log(val);
}

demo();
```

### E8: Non-Blocking Nature of Promises

```js
console.log('start');

Promise.resolve().then(() => console.log('promise then'));

console.log('end');

// Output:
// start
// end
// promise then
```

---

## Final Notes

* Promises are **core to async programming** in JavaScript.
* They rely on the **event loop and microtask queue** for scheduling.
* Key to keeping applications **non-blocking and responsive**.
* Use with care: handle rejections, avoid unhandled promise errors, and compose using utilities (`all`, `race`, `any`, `allSettled`).
