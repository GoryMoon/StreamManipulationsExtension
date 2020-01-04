const glob = require('glob');

const pages = {};

glob.sync('./src/pages/**/app.js').forEach((path) => {
  const chunk = path.split('./src/pages/')[1].split('/app.js')[0];
  pages[chunk] = {
    entry: path,
    template: 'public/index.html',
    title: '',
    chunks: ['chunk-vendors', 'chunk-common', chunk],
  };
});
module.exports = {
  publicPath: '.',
  pages,
  chainWebpack: (config) => {
    config.set('devtool', 'source-map');
    config.optimization
      .set('minimize', true)
      .set('usedExports', true);
    const minimizer = config.optimization.minimizer('terser');
    minimizer.tap((args) => {
      const arg = args;
      arg[0].terserOptions.mangle = false;
      return args;
    });

    const imgRule = config.module.rule('images');
    imgRule.uses.clear();
    imgRule
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: 'img/[name].[hash:8].[ext]',
      });
    const mediaRule = config.module.rule('media');
    mediaRule.uses.clear();
    mediaRule
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: 'media/[name].[hash:8].[ext]',
      });
    const fontRule = config.module.rule('fonts');
    fontRule.uses.clear();
    fontRule
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: 'fonts/[name].[hash:8].[ext]',
      });
  },
};
