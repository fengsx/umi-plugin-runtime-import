import React from 'react';
import { Link } from 'umi';
import { Avatar } from 'antd';
import A from '../components/A';
import B from '../components/B';
import C from '../components/C';
import D from '../components/D';

export default function IndexPage() {
  return (
    <Link to="/avatar">
      <A />
      <B />
      <C />
      <D />
      <Avatar>HOME</Avatar>
    </Link>
  );
}
