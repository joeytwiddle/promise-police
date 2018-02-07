const promiseWrapper = require('./promiseWrapper')

promiseWrapper.wrap(global, 'Promise')
