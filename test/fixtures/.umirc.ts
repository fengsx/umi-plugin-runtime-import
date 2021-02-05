import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  dynamicImport: {},
  fastRefresh: {},
  plugins: [require.resolve('../../lib/')],
  externals: { echarts: 'echarts' },
  dynamicImportFromCDN: {
    base: 'https:///gw.alipayobjects.com/os/lib/',
    js: {
      react: {
        moduleName: 'React',
        url: 'react/16.14.0/umd/react.development.js',
      },
      'react-dom': {
        moduleName: 'ReactDOM',
        url:
          'https:///gw.alipayobjects.com/os/lib/react-dom/16.14.0/umd/react-dom.development.js',
      },
      moment: {
        moduleName: 'moment',
        url: 'https://gw.alipayobjects.com/os/lib/moment/2.29.1/moment.js',
      },
      jquery: {
        moduleName: 'jQuery',
        url: 'https:///gw.alipayobjects.com/os/lib/jquery/3.5.1/dist/jquery.js',
      },
      echarts: {
        moduleName: 'echarts',
        url:
          'https:///gw.alipayobjects.com/os/lib/echarts/4.9.0/dist/echarts.common.min.js',
      },
      antd: {
        moduleName: 'antd',
        url: 'https://gw.alipayobjects.com/os/lib/antd/4.12.2/dist/antd.js',
      },
    },
    css: {
      'video.js/dist/video-js.min.css': 'video.js/7.6.6/dist/alt/video-js-cdn.min.css',
      'antd/dist/antd.css': {
        url: 'https://gw.alipayobjects.com/os/lib/antd/4.12.2/dist/antd.css',
      },
    },
  },
});
