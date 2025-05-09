const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: path.resolve(__dirname, 'src/js/index.js'),
    'recipe-summary': path.resolve(__dirname, 'src/js/modules/recipe/recipe-summary.js'),
    'cooking': path.resolve(__dirname, 'src/js/modules/cooking/cooking-mode.js')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/html/index.html'),
      filename: 'index.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/html/recipe-summary.html'),
      filename: 'recipe-summary.html',
      chunks: ['recipe-summary']
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/html/cooking.html'),
      filename: 'cooking.html',
      chunks: ['cooking']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/images/placeholder.jpg',
          to: 'assets/images/placeholder.jpg',
          priority: 10
        }
      ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/images',
          to: 'assets/images'
        },
        {
          from: 'src/styles',
          to: 'styles'
        }
      ]
    })
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'src'),
        publicPath: '/'
      },
      {
        directory: path.join(__dirname, 'src/assets'),
        publicPath: '/assets'
      },
      {
        directory: path.join(__dirname, 'src/styles'),
        publicPath: '/styles'
      }
    ],
    historyApiFallback: {
      rewrites: [
        { from: /^\/recipe\/.*/, to: '/recipe-summary.html' },
        { from: /^\/cooking\/.*/, to: '/cooking.html' }
      ]
    },
    proxy: {
      '/api': 'http://localhost:3001'
    },
    hot: true,
    port: 3000,
    open: true
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
};