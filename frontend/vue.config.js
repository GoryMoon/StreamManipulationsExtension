const glob = require('glob')

const pages = {}

glob.sync('./src/pages/**/app.js').forEach((path) => {
    const chunk = path.split('./src/pages/')[1].split('/app.js')[0]
    pages[chunk] = {
        entry: path,
        template: 'public/index.html',
        title: '',
        chunks: ['chunk-vendors', 'chunk-common', chunk]
    }
})
module.exports = {
    publicPath: '.',
    pages,
    configureWebpack: {
        module: {
            rules: [
                {
                    test: /\.(png|gif)/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'img/[name][hash:8].[ext][query]'
                    }
                }
            ]
        }
    },
    chainWebpack: (config) => {
        config.set('devtool', 'source-map')
        config.optimization
            .set('minimize', true)
            .set('usedExports', true)
        const minimizer = config.optimization.minimizer('terser')
        minimizer.tap((args) => {
            args[0].terserOptions.mangle = false
            return args
        })
    }
}
