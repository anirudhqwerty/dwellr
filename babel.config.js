module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for Expo Router
      'expo-router/babel',
      // Required for animations (if you use Reanimated)
      'react-native-reanimated/plugin',
    ],
  };
};