module.exports = api => {
  const isProduction = api.env('production');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: isProduction ? '.env.production' : '.env.development',
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
};
