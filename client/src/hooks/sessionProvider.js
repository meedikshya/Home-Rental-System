import React from "react";
import { useSessionTimeout } from "./userSessionTimeout.js";

const SessionTimeoutProvider = ({ children }) => {
  useSessionTimeout();
  return <>{children}</>;
};

export default SessionTimeoutProvider;
