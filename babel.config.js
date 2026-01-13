module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 'expo-router/babel' is deprecated and NOT needed here anymore
      'react-native-reanimated/plugin',
    ],
  };
};