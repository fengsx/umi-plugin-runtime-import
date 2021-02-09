import React from 'react';
import { Redirect } from 'umi';

export default () => {
  return (
    <Redirect
      to={{
        pathname: '/home',
        search: window.location.search,
        hash: window.location.hash,
      }}
    />
  );
};
