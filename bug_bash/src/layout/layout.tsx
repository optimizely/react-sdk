import React, { PropsWithChildren } from 'react';
import { Content, Grid } from './layout.css';

const AppLayout: React.FC<PropsWithChildren> = (props: PropsWithChildren) => {
  const { children } = props;

  return (
    <div style={Content}>
      <div style={Grid}>
        <div>
          <a href="/">Validate User Context</a>
        </div>
        <div>
          <a href="/fetch-qualified-segments">Fetch Qualified Segments</a>
        </div>
      </div>
      {children}
    </div>
  );
};

export default AppLayout;
