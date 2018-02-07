const defaultOptions = {
  timeout: 2000,

  ignoreList: [
    / at Mongoose.connect /,
    / at Mongoose.model /
  ],

  // If set to false, only the first promise created is checked.  Promises resulting from later .then()s are not checked.
  checkChains: true,

  // Set this true to consider a chain has been sufficiently handled after `.then(good, bad)`
  // Set this false to consider a chain only sufficiently handled after `.then(good).catch(bad)`
  // (Probably not a good idea to set it false: Many libraries in the wild use the former approach.)
  twoFunctionsCompleteChain: true
}

module.exports = {
  wrap: (obj, prop, options) => {
    options = Object.assign({}, defaultOptions, options)

    const OriginalPromiseConstructor = obj[prop]

    function NewPromiseConstructor (executor) {
      const promise = new OriginalPromiseConstructor(executor)
      addCheckingToPromise(promise, options)
      return promise
    }

    // Needed to get Promise.resolve() and Promise.all()
    Object.setPrototypeOf(NewPromiseConstructor, OriginalPromiseConstructor)

    // Not strictly needed, because we don't use this prototype to build new promises, but doing this might look more correct to nosy outsiders
    // NewPromiseConstructor.prototype = OriginalPromiseConstructor.prototype

    obj[prop] = NewPromiseConstructor
  }
}

function addCheckingToPromise (promise, options) {
  const stackWhenCalled = new Error('promise has not been .then()-ed or .catch()-ed!').stack

  const ignore = options.ignoreList.some(regexp => stackWhenCalled.match(regexp))
  if (ignore) {
    return promise
  }

  const originalThen = promise.then
  const originalCatch = promise.catch

  let hasBeenHandled = false

  promise.then = function () {
    hasBeenHandled = true
    const nextPromiseInChain = originalThen.apply(this, arguments)

    const onRejectWasPassed = arguments.length >= 2
    const catchWasHandled = onRejectWasPassed && options.twoFunctionsCompleteChain
    const keepChecking = options.checkChains && !catchWasHandled

    if (keepChecking) {
      addCheckingToPromise(nextPromiseInChain, options)
    }

    return nextPromiseInChain
  }

  promise.catch = function () {
    hasBeenHandled = true
    return originalCatch.apply(this, arguments)
  }

  setTimeout(() => {
    if (!hasBeenHandled) {
      const tidyStack = stackWhenCalled.split('\n').filter(line => !line.match(/\/promiseWrapper\.js:/)).join('\n')
      console.warn('Unhandled promise detected by promise-police:', tidyStack)
    }
  }, options.timeout)

  promise._underPoliceObservation = true

  return promise
}
