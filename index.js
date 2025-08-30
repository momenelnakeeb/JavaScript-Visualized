// console.log('1) sync start');

// setTimeout(() => console.log('6) task: setTimeout 0'), 0);

// queueMicrotask(() => console.log('3) microtask: queueMicrotask'));

// Promise.resolve()
//   .then(() => console.log('2) microtask: Promise.then'))
//   .then(() => console.log('4) microtask: Promise.then chain'))
//   .finally(() => console.log('5) microtask: Promise.finally'));

// console.log('7) sync end');



// setTimeout(() => console.log('task: setTimeout 0'), 0);
// setImmediate(() => console.log('task: setImmediate'));

// // I/O boundary often affects ordering; after I/O, setImmediate may win.
// require('fs').readFile(__filename, () => {
//   setTimeout(() => console.log('I/O → setTimeout 0'), 0);
//   setImmediate(() => console.log('I/O → setImmediate'));
// });

// let n = 0;
// const id = setInterval(() => {
//   n++;
//   console.log('interval tick', n);
//   if (n === 3) clearInterval(id);
// }, 0);


// const channel = new MessageChannel();
// channel.port1.onmessage = () => console.log('task: MessageChannel');
// channel.port2.postMessage(null);
// setTimeout(() => console.log('task: setTimeout 0'), 0);


// Promise.resolve('A')
//   .then(v => { console.log('then 1:', v); return v + 'B'; })
//   .then(v => { console.log('then 2:', v); throw new Error('boom'); })
//   .catch(e => { console.log('catch:', e.message); return 'recovered'; })
//   .finally(() => console.log('finally'))
//   .then(v => console.log('then 3:', v));


// console.log('sync start');

// fetch('https://example.com')
//   .then(() => console.log('microtask: fetch then #1'))
//   .then(() => console.log('microtask: fetch then #2'))
//   .catch(err => console.log('microtask: fetch catch', err))
//   .finally(() => console.log('microtask: fetch finally'));

// console.log('sync end');