# promise-police

In alpha.  Please see the [Caveats](#caveats).

## What it does

promise-police is a debugging tool that detects promises in your application which you have forgotten to handle.

This is especially useful for developers who are just starting to learn promises.  It helps to catch common mistakes such as forgetting to `return` or `await` a promise.

It enforces "The Golden Rule of Promises":

_**Every promise must either be awaited, or returned, or caught.**_

## How to use it

Basic usage, only in development:

```js
if (!process.env.NODE_ENV) {
  require('promise-police')
}
```

We only load the module in development mode, so our production app can create lots of promises with no additional overhead.

## See it in action

If you write code like this, nothing will change:

```js
createPromise().then(handleSuccess).catch(handleError)

createPromise().then(handleSuccess, handleError)

createPromise().catch(handleError)

await createPromise()

return createPromise()
```

But code like this will alert the promise-police:

```js
// You forgot to catch
createPromise().then(handleSuccess)

// You forgot to do anything with the promise
createPromise()
```

Specifically, if you create a promise and you don't add any handlers within the timeout period, a warning will be logged:

```
Unhandled promise detected by promise-police: Error: Promise has not been .then()-ed or .catch()-ed!
    at createPromise (test.js:24:11)
    at main (test.js:12:4)
    at ...
```

By looking down the stacktrace, you should be able to find the line of code where you forgot to handle the promise.

Note that in the case of a promise chain, the stacktrace will only indicate the last `.then()` in the chain, not the start of the chain.  For more informative stacktraces, you may want to enable long stacktrace support: [node](https://github.com/mattinsler/longjohn), [ES6 Promise](https://gist.github.com/joeytwiddle/8c357b8a4ac6803a0f188d495901b6bc), [bluebird](http://bluebirdjs.com/docs/api/promise.longstacktraces.html), [Q](https://stackoverflow.com/a/24046877)

## How it works

By default, this module replaces the global `Promise` constructor with our own constructor which always calls the original `Promise` constructor, but also adds some magic to the newly created promise.

## Configuration

Instead of the basic uage above, you can configure the module to behave differently.

In environments where the logged stacktrace is not helpful (such as Expo with CRNA), you can throw an error instead of logging:

```js
require('promise-police/configure')({ throwError: true });
```

This will produce more useful output, because a thrown error will have its stack passed through the source map.

## Advanced configuration

Or you can perform a fully detailed configuration:

```js
const promiseWrapper = require('promise-police/promiseWrapper')

promiseWrapper.wrap(global, 'Promise', {
  // How long to wait for a .then() or .catch() to be added to the promise.

  timeout: 2000,

  // Some libraries do not always handle the promises they create.
  // If you receive warnings that you want to mute, you can add a regexp that will match only that code's stacktrace.

  ignoreList: promiseWrapper.defaultOptions.ignoreList.concat([
    / at Mongoose.connect /,
    / at Mongoose.model /
  ]),

  // If set to false, only the first promise created is checked.  Promises resulting from later .then()s are not checked.

  checkChains: true,

  // Set this true to consider a chain has been sufficiently handled after `.then(onWin, onFail)`
  // Leave this false to consider a chain only sufficiently handled after `.then(onWin).catch(onFail)`
  // (Many libraries use the former approach, so the default is currently true, but
  // false is stricter, and therefore preferred when applying purely to app code.)

  twoFunctionsCompleteChain: true,

  // Instead of logging, throw an error when an unhandled promise is detected
  // This is good when using create-react-native-app, because the stack will display properly

  throwError: true,
})
```

You could also potentially add this behaviour to other promise libraries (e.g. `bluebird` or `Q`), but that feature is not yet well supported.

## Caveats

- A lot of **libraries** do not follow the Golden Rule: they skip doing `.catch()` because they are confident that the promise will resolve.  Unfortunately, promise-police cannot tell the difference between violations of the Golden Rule in libraries, and violations in your app.

  **promise-police will detect and report violations inside libraries until a suitable regexp is added to the `ignoreList`.**  This is a pain when using lots of libraries.

  We could add `/node_modules/` as an ignore regexp.  That would work, but it would also avoid checking many promises that we want to check: promises created inside a package but returned to the app for handling, or promises created inside app code but on a stack that was initiated from inside a package.  (The second case might be detectable because there will be nore `/node_modules/` at the top of the stack.  But in the first case, promise-police doesn't know whether the promise is returned to your app code or if it only existed inside the library.)

  Todo: One way to mitigate this might be to offer the developer an interactive prompt: "Ignore this violation in future?"

- When running minified or transpiled code (for example, React Native with Expo), when a violation is reported the lines in the logged stacktrace are unhelpful, because they have not yet been passed through the source maps.  In those cases, you can probably get a more useful stacktrace by [throwing an error](#configuration) instead of logging.

  Todo: We could also try using one of these projects to pass the stack lines through the sourcemap at runtime: [sourcemapped-stacktrace](https://github.com/novocaine/sourcemapped-stacktrace), [mapstrace](https://github.com/janekp/mapstrace).

- If you are using mongoose, and you create a query but forget to handle it, promise-police will not detect that.  That's because mongoose queries do not turn into promises until you either `.exec()` or `.then()` them.  In this case, the query won't even be executed.  (To catch that, we would need to monkey-patch mongoose queries, to detect when a query is build but never executed.)

## Todo

- Add tests.
- Allow event handler to be registered instead of throwing an error or logging a warning?
- Provide the same functionality for Q and Bluebird users?  (Refactor so we can do `Q = wrap(require('q'))`)
- Test more environments.  (React Native, WebPack, ...)
- Police more constraints, such as those in Soares's post?  (I haven't experienced a need for most of them, but YMMV!)  One other constraint I would like: Complain if Promises are rejected without an Error object.
- We could make the regexp blacklist checking more efficient, but that is probably overkill for a simple development tool.

## See also

- Inspiration for this utility came from reading [this post](https://github.com/soareschen/es6-promise-debugging/blob/master/README.md) about promise debugging by Soares Chen.

- An earlier experiment I made with promises can be found in this gist: [Long Stack Support for ES6 Promises](https://gist.github.com/joeytwiddle/8c357b8a4ac6803a0f188d495901b6bc)

- Something smiilar, but probably better: https://www.npmjs.com/package/trace-unhandled
