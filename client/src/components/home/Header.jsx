import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { Link } from "react-router-dom";
import logo from "../../assets/images/Logo.png"; // Correct import

const Navbar = ({ user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center w-full px-5 py-4 bg-transparent text-white relative">
      {/* Logo Section */}
      <div>
        <img
          src={logo}
          className="h-16 w-20 md:h-14 md:w-15 rounded-full object-cover"
          alt="logo"
        />
      </div>

      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
        className="md:hidden text-[#98735B] cursor-pointer focus:outline-none"
      >
        <GiHamburgerMenu size={28} />
      </button>

      {/* Navigation Links */}
      <div
        className={`${
          isOpen ? "flex" : "hidden"
        } md:flex md:flex-row md:items-center absolute md:static left-0 top-[60px] md:top-auto w-full md:w-auto md:ml-auto md:gap-8 justify-center bg-gray-800 md:bg-transparent p-4 md:p-0 rounded-lg`}
      >
        <ul className="flex flex-col md:flex-row md:gap-8 gap-4 items-center text-base text-[#BC9F8B]">
          <li>
            <a href="#home" className="hover:text-[#deb89e]">
              Home
            </a>
          </li>
          <li>
            <a href="#about" className="hover:text-[#deb89e]">
              About
            </a>
          </li>
          <li>
            <a href="#projects" className="hover:text-[#deb89e]">
              Projects
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:text-[#deb89e]">
              Contact
            </a>
          </li>
        </ul>

        {/* Profile & Logout Dropdown */}
        {user ? (
          <div className="relative ml-6">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg"
            >
              <FaUserCircle size={24} />
              <span>{user.email.split("@")[0]}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 bg-gray-800 shadow-lg rounded-lg w-40">
                <ul className="text-white">
                  <li className="p-3 hover:bg-gray-700">
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li
                    className="p-3 hover:bg-gray-700 flex items-center cursor-pointer"
                    onClick={logout}
                  >
                    <MdLogout size={20} className="mr-2" />
                    Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="ml-6 bg-[#BC9F8B] text-white px-4 py-2 rounded-lg hover:bg-[#deb89e]"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
