import React from "react";

import Navbar from "./NavbarAdmin.js";
import Sidebar from "./SidebarAdmin.js";

const LayoutAdmin = ({ children }) => {
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

export default LayoutAdmin;
