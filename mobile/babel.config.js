module.exports = api => {
  const isProduction = api.env('production');

  const plugins = [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: isProduction ? '.env.production' : '.env.development',
        safe: false,
        allowUndefined: true,
      },
    ],
  ];

  // 프로덕션 빌드에서 console.* 구문 제거
  if (isProduction) {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
