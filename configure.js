const promiseWrapper = require('./promiseWrapper')

module.exports = (config) => {
  promiseWrapper.wrap(global, 'Promise', config)
}
