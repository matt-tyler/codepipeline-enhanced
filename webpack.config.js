module.exports = {
  entry: {
      "pipeline/result": "./src/pipeline/result/index.ts",
      "pipeline/deployment": "./src/pipeline/deployment/index.ts",
  },
  output: {
    filename: "[name]/index.js",
    libraryTarget: "commonjs2",
    path: __dirname + "/.aws-sam/build/"
  },
  devtool: false,
  resolve: {
    extensions: [".ts", ".js"]
  },
  target: "node",
  externals: [],//process.env.NODE_ENV === "development" ? [] : ["aws-sdk"],
  mode: process.env.NODE_ENV || "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "babel-loader"
      }
    ]
  },
  plugins: []
}