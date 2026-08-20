module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // إضافةُ worklets آخرُ الإضافات دائمًا (شرطُ react-native-reanimated 4)
    plugins: ["react-native-worklets/plugin"],
  };
};
