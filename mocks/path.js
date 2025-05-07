// Mock path module for React Native
module.exports = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
  dirname: (path) => path.split('/').slice(0, -1).join('/'),
  basename: (path) => path.split('/').pop()
}; 