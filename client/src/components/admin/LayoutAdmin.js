import React from "react";
import Navbar from "./NavbarAdmin.js";
import Sidebar from "./SidebarAdmin.js";

const LayoutAdmin = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-6 flex-1">{children}</div>
      </div>
    </div>
  );
};

export default LayoutAdmin;
