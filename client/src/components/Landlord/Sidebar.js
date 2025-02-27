import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MdSpaceDashboard, MdOutlineChat } from "react-icons/md";
import { BsCalendarCheck } from "react-icons/bs";
import { FaMoneyCheckAlt } from "react-icons/fa";
import { HiMenuAlt3 } from "react-icons/hi";
import Logo from "../../assets/images/Logo.png";

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  // Add event listener to adjust sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Menus = [
    {
      title: "Property",
      path: "/landlord/property",
      icon: <MdSpaceDashboard />,
    },
    { title: "Booking", path: "/landlord/booking", icon: <BsCalendarCheck /> },
    { title: "Chat", path: "/landlord/chat", icon: <MdOutlineChat /> },
    { title: "Payment", path: "/landlord/payment", icon: <FaMoneyCheckAlt /> },
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
          {/* Top Section: Logo & Hamburger */}
          <div className="flex items-center justify-between mb-6">
            {open && (
              <img
                src={Logo}
                alt="Logo"
                className="w-32 transition-all duration-300"
              />
            )}

            {/* Toggle Button */}
            <button
              className="text-3xl cursor-pointer hover:text-gray-300 transition-colors p-1"
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

      {/* Content Spacer - This pushes content to the right */}
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

export default Sidebar;
