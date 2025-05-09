const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolution for Node.js modules
config.resolver.extraNodeModules = {
  // Core modules
  http: require.resolve('react-native-http'),
  https: require.resolve('react-native-http'),
  stream: require.resolve('react-native-stream'),
  crypto: require.resolve('react-native-crypto'),
  events: require.resolve('events'),
  buffer: require.resolve('buffer'),
  process: require.resolve('process/browser'),
  
  // Empty modules for Node.js modules not available in React Native
  net: path.resolve(__dirname, 'mocks/net.js'),
  tls: path.resolve(__dirname, 'mocks/tls.js'),
  fs: path.resolve(__dirname, 'mocks/fs.js'),
  path: path.resolve(__dirname, 'mocks/path.js'),
  zlib: path.resolve(__dirname, 'mocks/zlib.js'),
  dns: path.resolve(__dirname, 'mocks/dns.js'),
  
  // Provide the ws implementation
  'ws': path.resolve(__dirname, 'mocks/ws.js'),
};

// Ensure that require.resolve doesn't throw errors for Node.js core modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config; 