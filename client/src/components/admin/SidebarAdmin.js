import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MdSpaceDashboard, MdHolidayVillage } from "react-icons/md";
import { BsCalendarCheck } from "react-icons/bs";
import { HiDocumentText, HiMenuAlt3 } from "react-icons/hi";
import { FaMoneyCheckAlt, FaUsers } from "react-icons/fa";

const SidebarAdmin = () => {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Menus = [
    {
      title: "Dashboard",
      path: "/admin/dashboard",
      icon: <MdSpaceDashboard />,
    },
    {
      title: "Users",
      path: "/admin/analytics",
      icon: <FaUsers />,
    },
    {
      title: "Properties",
      path: "/admin/properties",
      icon: <MdHolidayVillage />,
    },
    {
      title: "Bookings",
      path: "/admin/bookings",
      icon: <BsCalendarCheck />,
    },
    {
      title: "Agreements",
      path: "/admin/agreements",
      icon: <HiDocumentText />,
    },
    {
      title: "Payments",
      path: "/admin/payments",
      icon: <FaMoneyCheckAlt />,
    },
  ];

  return (
    <>
      {/* Fixed Sidebar */}
      <div
        className="fixed left-0 top-0 h-screen z-40"
        style={{
          width: open ? "240px" : "80px",
          transition: "width 0.3s ease",
        }}
      >
        <div className="h-full bg-blue-900 text-white p-4 flex flex-col shadow-lg">
          {/* Top Section: Title & Toggle Button */}
          <div className="flex items-center justify-between mb-6">
            {open && (
              <h1 className="text-xl font-bold transition-all duration-300">
                Admin Panel
              </h1>
            )}

            {/* Toggle Button */}
            <button
              className="text-3xl cursor-pointer hover:text-blue-300 transition-colors p-1"
              onClick={() => setOpen(!open)}
              aria-label="Toggle sidebar"
            >
              <HiMenuAlt3 />
            </button>
          </div>

          {/* Menu Items */}
          <ul className="mt-6 space-y-4 overflow-y-auto flex-grow">
            {Menus.map((menu, index) => (
              <Link to={menu.path} key={index}>
                <li
                  className={`flex items-center gap-x-4 p-3 rounded-lg cursor-pointer transition-all duration-200 
                  ${
                    location.pathname === menu.path
                      ? "bg-blue-700"
                      : "hover:bg-blue-800"
                  }`}
                >
                  <span className="text-2xl">{menu.icon}</span>
                  <span className={`${!open && "hidden"} duration-300`}>
                    {menu.title}
                  </span>
                </li>
              </Link>
            ))}
          </ul>
        </div>
      </div>

      {/* Spacer div to maintain layout */}
      <div
        className="transition-all duration-300"
        style={{
          width: open ? "240px" : "80px",
          flexShrink: 0,
        }}
      />
    </>
  );
};

export default SidebarAdmin;
