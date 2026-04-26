const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// openai 동적 import가 Hermes에서 실패하므로 빈 모듈로 대체
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'openai') {
    return {
      filePath: path.resolve(__dirname, 'openai-shim.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
