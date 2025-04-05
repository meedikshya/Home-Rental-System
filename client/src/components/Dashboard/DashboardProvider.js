import React, { createContext, useState } from "react";

export const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);

  return (
    <DashboardContext.Provider value={{ activeTooltip, setActiveTooltip }}>
      {children}
    </DashboardContext.Provider>
  );
};
