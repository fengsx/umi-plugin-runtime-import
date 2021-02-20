import React from 'react';
import echarts from 'echarts';
import 'video.js/dist/video-js.min.css';

const E = React.lazy(
  () => import(/* webpackChunkName: "specified_external_name_E" */ './E'),
);

console.info('-------------- echarts version --------------');
// @ts-ignore
console.info(echarts.version);
export default function O() {
  return (
    <React.Suspense fallback="Avatar O">
      <E />
    </React.Suspense>
  );
}
