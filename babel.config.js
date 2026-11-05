module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo include già il plugin di Reanimated/Worklets.
  return { presets: ['babel-preset-expo'] };
};
