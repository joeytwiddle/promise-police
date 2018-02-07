# What it does

promise-police is a debugging tool that detects promises in your application which you have forgotten to handle.

This is especially useful for developers who are just starting to learn promises.  It helps to catch common mistakes such as forgetting to `return` or `await` a promise.

It enforces "The Golden Rule of Promises":

_**Every promise must either be caught, or returned.**_

# How to use it

Basic usage:

```js
if ((process.env.NODE_ENV || 'development') === 'development') {
  require('promise-police')
}
```

# See it in action

Examples of valid code:

```js
createPromise().then(handleSuccess).catch(handleError)

createPromise().then(handleSuccess, handleError)

createPromise().catch(handleError)

return createPromise()
```

Examples of invalid code:

```js
// You forgot to catch
createPromise().then(handleSuccess)

// You forgot to do anything with the promise
createPromise()
```

If you create a promise and you don't add any handlers within the timeout period, a warning will be logged:

```
Error: Unhandled promise detected by promise-police: Promise has not been .then()-ed or .catch()-ed!
    at createPromise (test.js:24:11)
    at main (test.js:12:4)
    at ...
```

Note that in the case of a promise chain, the stack trace will only indicate the last `.then()` in the chain, not the start of the chain.  For more informative stack traces, you may want to enable long stacktrace support: [node](https://github.com/mattinsler/longjohn) [ES6 Promise](https://gist.github.com/joeytwiddle/8c357b8a4ac6803a0f188d495901b6bc) [bluebird](http://bluebirdjs.com/docs/api/promise.longstacktraces.html) [Q](https://stackoverflow.com/a/24046877)

# How it works

By default, this module replaces the global `Promise` constructor with our own constructor which always calls the original `Promise` constructor, but also adds some magic to the newly created promise.

# Advanced usage

You can override the default options by providing your own values.

```js
const promiseWrapper = require('promise-police/promiseWrapper')

promiseWrapper.wrap(global, 'Promise', {
  // How long to wait for a .then() or .catch() to be added to the promise.
  //timeout: 2000,

  // Some libraries do not always handle the promises they create.
  // If you receive warnings that you want to mute, you can add a regexp that will match only that code's stacktrace.
  ignoreList: [
    / at Mongoose.connect /,
    / at Mongoose.model /
  ],

  // If set to false, only the first promise created is checked.  Promises resulting from later .then()s are not checked.
  //checkChains: true,

  // Set this true to consider a chain has been sufficiently handled after `.then(good, bad)`
  // Set this false to consider a chain only sufficiently handled after `.then(good).catch(bad)`
  // (Probably not a good idea to set it false: Many libraries in the wild use the former approach.)
  //twoFunctionsCompleteChain: true
})
```

You could also potentially add this behaviour to other promise libraries (e.g. `bluebird` or `Q`), but that feature is not yet well supported.

# Caveats

- If you are using mongoose, and you create a query but forget to handle it, promise-police will not detect it.  That's because mongoose queries do not turn into promises until you either `.exec()` or `.then(0` them.

# Todo

- Option to throw an error rather than just log a warning?
- Provide the same functionality for Q and Bluebird users?

# See also

- Inspiration for this utility came from reading [this post](https://github.com/soareschen/es6-promise-debugging/blob/master/README.md) about promise debugging by Soares Chen.

