const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { NODE_ENV = "production" } = process.env;

module.exports = {
  entry: "./src",
  target: "node",
  mode: NODE_ENV,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./src/views", to: "./views" },
        // { from: "./src/style", to: "./style" },
		// { from: "./src/js", to: "./js" },
		{ from: "./src/public", to: "./public" },
      ],
    }),
  ],
  //   stats: {
  //     children: true,
  //   },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    fallback: {
      // "fs": false,
      // "tls": false,
      // "net": false,
      // "path": false,
      // "zlib": false,
      // "http": false,
      // "https": false,
      // "stream": false,
      // "crypto": false,
      // "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify
    },
  },
  devServer: {
    static: path.join(__dirname, "dist"),
    compress: true,
    port: 4000,
  },
};
