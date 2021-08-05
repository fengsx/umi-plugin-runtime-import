import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  dynamicImport: {},
  webpack5: {},
  plugins: [require.resolve('../lib')],
  externals: { echarts: 'echarts' },
  runtimeImport: {
    base: 'https://gw.alipayobjects.com/os/lib/',
    js: {
      react: {
        moduleName: 'React',
        url: 'https://unpkg.com/react@16.13.0/umd/react.development.js',
      },
      'react-dom': {
        moduleName: 'ReactDOM',
        url: 'https://unpkg.com/react-dom@16.13.0/umd/react-dom.development.js',
      },
      jquery: {
        moduleName: 'jQuery',
        url: 'https://unpkg.com/jquery@3.6.0/dist/jquery.js',
      },
      echarts: {
        moduleName: 'echarts',
        url: 'https://unpkg.com/echarts@4.9.0/dist/echarts.common.min.js',
      },
      antd: {
        moduleName: 'antd',
        url: 'https://gw.alipayobjects.com/os/lib/antd/4.12.3/dist/antd.js',
      },
      moment: {
        moduleName: 'moment',
        url: 'https://unpkg.com/moment@2.29.1/moment.js',
      },
      'video.js': {
        moduleName: 'window["videojs"]',
        url: 'https://gw.alipayobjects.com/os/lib/video.js/7.6.6/dist/video.min.js',
      },
    },
    css: {
      'video.js/dist/video-js.min.css':
        'video.js/7.6.6/dist/alt/video-js-cdn.min.css',
      'antd/dist/antd.css': {
        url: 'https://gw.alipayobjects.com/os/lib/antd/4.16.8/dist/antd.css',
      },
    },
  },
});
