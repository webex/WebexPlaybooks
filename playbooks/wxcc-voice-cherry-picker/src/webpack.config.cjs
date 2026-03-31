const path = require("path");
const Dotenv = require('dotenv-webpack');


const config = {
  mode: "production",
  entry: "./widget-SDK-Voice.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js",
    publicPath: "build/"
  },
  module: {
    rules: [
      {
        use: "babel-loader",
        test: /\.js$/
      }
    ]
  },
  plugins: [
    new Dotenv()
  ]
};

module.exports = config;
