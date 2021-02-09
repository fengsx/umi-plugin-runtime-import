import React from 'react';
import { Link } from 'umi';
import moment from 'moment';
import jQuery from 'jquery';
import { Avatar } from 'antd';
import A from '../components/A';
import B from '../components/B';
import C from '../components/C';
import O from '../components/O';

console.info('-------------- moment --------------');
console.info(moment().toNow());
console.info('-------------- jQuery --------------');
console.info(jQuery);

export default function IndexPage() {
  return (
    <Link to="/home">
      <A />
      <B />
      <C />
      <O />
      <Avatar>Avatar</Avatar>
    </Link>
  );
}
