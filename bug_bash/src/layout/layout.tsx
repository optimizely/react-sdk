import React, { PropsWithChildren } from "react";
import { Content, Grid } from "./layout.css";

const AppLayout: React.FC<PropsWithChildren> = (props: PropsWithChildren) => {
  const { children } = props;

  return (
    <div style={Content}>
      <div style={Grid}>
        <button>Fetch Qualified Segments</button>
      </div>
      {children}
    </div>
  );
};

export default AppLayout;
