import React from "react";
import Navbar from "./Navbar.js";
import Sidebar from "./Sidebar.js";

const Layout = ({ children }) => {
  return (
    <>
      <div className="flex flex-auto h-screen">
        <Sidebar />
        <div className="grow">
          <Navbar />
          <div className="m-5">{children}</div>
        </div>
      </div>
    </>
  );
};

export default Layout;
