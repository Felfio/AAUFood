const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const webpack = require('webpack');

module.exports = {
    entry: ["./public/scripts.js", "bootstrap-loader"],
    output: {
        path: path.join(__dirname, 'public/dist'),
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /(node_modules|bower_components)/,
                query: {
                    presets: [
                        ["es2015", {"modules": false}]
                    ]
                }
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: ["css-loader?minimize=true", "postcss-loader", "sass-loader"]
                })
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: ["css-loader?minimize=true"]
                })
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader?limit=10000&mimetype=application/font-woff"
            },
            {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader"},
            {test: /\.png$/, loader: "url-loader?limit=10000"},
            {test: /\.jpg$/, loader: "url-loader?limit=10000"}
        ]
    },
    plugins: [
        new ExtractTextPlugin({filename: "bundle.css", allChunks: true}),
        new webpack.optimize.UglifyJsPlugin(),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            "window.Tether": 'tether',
            "Tether": 'tether',
	    "Popper": "popper.js",
	    "Tooltip": "exports-loader?Tooltip!bootstrap/js/dist/tooltip",
	    "Util": 'exports-loader?Util!bootstrap/js/dist/util',
        })
    ]
};
