const path = require('path')

module.exports = {
    entry: {
        app: './src/app.js',
        test: './src/views/test.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, '../dist')
    },
    target: 'node',
    // mode: 'production',
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
        ]
    }
}
