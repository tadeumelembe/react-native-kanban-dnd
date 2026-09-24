// Resolves `react-native-kanban-dnd` to the library source in ../src, and makes
// sure every dependency (react, reanimated, ...) comes from example/node_modules.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, 'src')];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];
config.resolver.extraNodeModules = {
  'react-native-kanban-dnd': path.join(root, 'src'),
};

module.exports = config;
