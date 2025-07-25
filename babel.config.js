module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16'
        }
      }
    ]
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  }
};