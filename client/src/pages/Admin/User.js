import React, { useState, useEffect, useCallback } from "react";
import {
  FaUser,
  FaUserTie,
  FaUserCog,
  FaSearch,
  FaFilter,
  FaRegEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSort,
  FaTimes,
  FaEye,
  FaSpinner,
  FaInfoCircle,
  FaUsers,
} from "react-icons/fa";
import ApiHandler from "../../api/ApiHandler.js";
import PaginationControls from "../../components/UI/PaginationControls.js";

const User = () => {
  // Main data states
  const [users, setUsers] = useState([]);
  const [userDetails, setUserDetails] = useState([]);
  const [combinedUsers, setCombinedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);

  // Sorting, pagination and modal states
  const [sortConfig, setSortConfig] = useState({
    key: "lastName",
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Role options for filtering
  const roleOptions = [
    { value: "All", label: "All Roles" },
    { value: "Admin", label: "Admin", icon: <FaUserCog /> },
    { value: "Landlord", label: "Landlord", icon: <FaUserTie /> },
    { value: "Renter", label: "Renter", icon: <FaUser /> },
  ];

  // Fetch data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersResponse, userDetailsResponse] = await Promise.all([
          ApiHandler.get("/Users"),
          ApiHandler.get("/UserDetails"),
        ]);

        setUsers(usersResponse || []);
        setUserDetails(userDetailsResponse || []);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
        setIsPageLoaded(true);
      }
    };

    fetchData();
  }, []);

  // Combine user data when both sets are available
  useEffect(() => {
    if (users.length && userDetails.length) {
      const combined = users.map((user) => {
        const details =
          userDetails.find((detail) => detail.userId === user.userId) || {};
        return {
          ...user,
          ...details,
          fullName:
            details.firstName && details.lastName
              ? `${details.firstName} ${details.lastName}`
              : "No Name",
          initials:
            details.firstName && details.lastName
              ? `${details.firstName.charAt(0)}${details.lastName.charAt(
                  0
                )}`.toUpperCase()
              : "??",
        };
      });
      setCombinedUsers(combined);
      setTotalPages(Math.ceil(combined.length / pageSize) || 1);
    }
  }, [users, userDetails, pageSize]);

  // Get role-specific icon
  const getUserRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <FaUserCog className="text-blue-600" />;
      case "landlord":
        return <FaUserTie className="text-indigo-600" />;
      case "renter":
        return <FaUser className="text-purple-600" />;
      default:
        return <FaUser className="text-gray-600" />;
    }
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Apply filters and sorting
  const filterAndSortUsers = useCallback(() => {
    let filtered = [...combinedUsers];

    // Apply role filter
    if (selectedRole !== "All") {
      filtered = filtered.filter((user) => user.userRole === selectedRole);
    }

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower) ||
          user.address?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (!a[sortConfig.key] && !b[sortConfig.key]) return 0;
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;

      const aValue =
        typeof a[sortConfig.key] === "string"
          ? a[sortConfig.key].toLowerCase()
          : a[sortConfig.key];
      const bValue =
        typeof b[sortConfig.key] === "string"
          ? b[sortConfig.key].toLowerCase()
          : b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [combinedUsers, selectedRole, searchQuery, sortConfig]);

  // Get paginated users
  const getPaginatedUsers = useCallback(() => {
    const filtered = filterAndSortUsers();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  }, [filterAndSortUsers, currentPage, pageSize]);

  // Calculate total pages
  useEffect(() => {
    const filtered = filterAndSortUsers();
    setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
  }, [filterAndSortUsers, pageSize]);

  // Handle actions on users
  const handleUserAction = (user, action) => {
    setSelectedUser(user);

    switch (action) {
      case "view":
        setShowUserModal(true);
        break;
      case "edit":
        // Handle edit action
        console.log("Edit user:", user);
        break;
      case "delete":
        // Handle delete action
        if (
          window.confirm(`Are you sure you want to delete ${user.fullName}?`)
        ) {
          console.log("Delete user:", user);
        }
        break;
      default:
        break;
    }
  };

  // Apply filters
  const applyFilters = () => {
    setApplyingFilters(true);
    setCurrentPage(1);

    // Simulate filter application delay
    setTimeout(() => {
      setIsFilterVisible(false);
      setApplyingFilters(false);
    }, 300);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedRole("All");
    setCurrentPage(1);
  };

  // Get current users
  const currentUsers = getPaginatedUsers();
  const allFilteredUsers = filterAndSortUsers();

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <p className="flex items-center text-lg font-medium mb-2 text-red-700">
            <FaInfoCircle className="mr-2" /> Error
          </p>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
            onClick={() => window.location.reload()}
          >
            <FaSpinner className="mr-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-xl font-bold mb-2 flex items-center">
              <FaUsers className="mr-2" /> User Management
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center justify-center px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors"
            >
              <FaFilter className="mr-2" />
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <div
          className={`mt-4 overflow-hidden transition-all duration-300 ${
            isFilterVisible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {/* Search input */}
              <div className="flex-grow">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Search Users
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, phone or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Role filter */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "All" ? "All Roles" : option.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter actions */}
              <div className="flex space-x-2">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors flex items-center"
                  disabled={applyingFilters}
                >
                  {applyingFilters ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" /> Applying...
                    </>
                  ) : (
                    "Apply Filters"
                  )}
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-white/50 text-white rounded-md hover:bg-white/10 transition-colors"
                  disabled={applyingFilters}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`transition-opacity duration-500 ${
          isPageLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Filter indicators */}
        {(selectedRole !== "All" || searchQuery) && (
          <div className="bg-white p-4 border-b border-gray-200 rounded-t-lg shadow-sm mb-0">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500 font-medium mr-2">
                <FaFilter className="inline mr-1" /> Active Filters:
              </span>

              {searchQuery && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                  Search: {searchQuery}
                </span>
              )}

              {selectedRole !== "All" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                  Role: {selectedRole}
                </span>
              )}

              <span className="ml-auto text-sm text-gray-500">
                <strong>{allFilteredUsers.length}</strong> total users
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
            <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
            <p className="text-gray-600">Loading user data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            {/* No users found state */}
            {currentUsers.length === 0 && (
              <div className="text-center py-16">
                <FaUsers className="mx-auto text-gray-400 text-5xl mb-3" />
                <h3 className="text-xl font-medium text-gray-600 mb-1">
                  No Users Found
                </h3>
                <p className="text-gray-500">
                  {selectedRole !== "All"
                    ? `There are no ${selectedRole.toLowerCase()} users.`
                    : searchQuery
                    ? "There are no users matching your search criteria."
                    : "There are no users in the system."}
                </p>
              </div>
            )}

            {/* Desktop table view */}
            {currentUsers.length > 0 && (
              <div className="hidden sm:block w-full">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="w-[5%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        S.N
                      </th>
                      <th
                        scope="col"
                        className="w-[25%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("fullName")}
                      >
                        <div className="flex items-center">
                          User
                          <FaSort className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="w-[25%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("email")}
                      >
                        <div className="flex items-center">
                          Contact
                          <FaSort className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("userRole")}
                      >
                        <div className="flex items-center">
                          Role
                          <FaSort className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="w-[20%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort("address")}
                      >
                        <div className="flex items-center">
                          Location
                          <FaSort className="ml-1" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="w-[10%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentUsers.map((user, index) => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-2 py-4 text-sm font-medium text-[#20319D]">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-800 font-bold">
                              {user.initials}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {user.fullName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <div className="space-y-1 truncate">
                            <div className="flex items-center text-sm text-gray-900">
                              <FaRegEnvelope className="mr-2 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {user.email || "N/A"}
                              </span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <FaPhoneAlt className="mr-2 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center">
                            {getUserRoleIcon(user.userRole)}
                            <span className="ml-2 text-sm text-gray-900">
                              {user.userRole || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center text-sm text-gray-900 truncate">
                            <FaMapMarkerAlt className="mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {user.address || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <button
                            onClick={() => handleUserAction(user, "view")}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <FaEye className="mr-1" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile card view */}
            {currentUsers.length > 0 && (
              <div className="sm:hidden">
                <div className="grid grid-cols-1 gap-4 p-4">
                  {currentUsers.map((user, index) => (
                    <div
                      key={user.userId}
                      className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-medium text-[#20319D] bg-blue-50 px-2 py-1 rounded-md">
                          {(currentPage - 1) * pageSize + index + 1}
                        </span>
                        <div
                          className="flex items-center px-2 py-1 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor:
                              user.userRole?.toLowerCase() === "admin"
                                ? "#DBEAFE"
                                : user.userRole?.toLowerCase() === "landlord"
                                ? "#EDE9FE"
                                : "#FCE7F3",
                            color:
                              user.userRole?.toLowerCase() === "admin"
                                ? "#1E40AF"
                                : user.userRole?.toLowerCase() === "landlord"
                                ? "#5B21B6"
                                : "#9D174D",
                          }}
                        >
                          {getUserRoleIcon(user.userRole)}
                          <span className="ml-1">{user.userRole}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold text-lg mr-3">
                            {user.initials}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.fullName}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            Contact:
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <FaRegEnvelope
                                className="mr-2 text-gray-400 flex-shrink-0"
                                size={14}
                              />
                              <span className="truncate">
                                {user.email || "N/A"}
                              </span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <FaPhoneAlt
                                  className="mr-2 text-gray-400 flex-shrink-0"
                                  size={14}
                                />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {user.address && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Address:
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <FaMapMarkerAlt
                                className="mr-2 text-gray-400 flex-shrink-0"
                                size={14}
                              />
                              <span className="truncate">{user.address}</span>
                            </div>
                          </div>
                        )}

                        <div className="pt-3">
                          <button
                            onClick={() => handleUserAction(user, "view")}
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <FaEye className="mr-2" /> View User
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="h-32 w-32 rounded-full bg-indigo-100 flex items-center justify-center text-4xl font-bold text-indigo-700">
                  {selectedUser.initials}
                </div>
                <div className="text-center mt-2">
                  <p className="font-medium text-gray-900">
                    {selectedUser.fullName}
                  </p>
                  <div
                    className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor:
                        selectedUser.userRole?.toLowerCase() === "admin"
                          ? "#DBEAFE"
                          : selectedUser.userRole?.toLowerCase() === "landlord"
                          ? "#EDE9FE"
                          : "#FCE7F3",
                      color:
                        selectedUser.userRole?.toLowerCase() === "admin"
                          ? "#1E40AF"
                          : selectedUser.userRole?.toLowerCase() === "landlord"
                          ? "#5B21B6"
                          : "#9D174D",
                    }}
                  >
                    {getUserRoleIcon(selectedUser.userRole)}
                    <span className="ml-1">{selectedUser.userRole}</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center">
                      <FaRegEnvelope className="mr-2 text-gray-400" />
                      {selectedUser.email || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium flex items-center">
                      <FaPhoneAlt className="mr-2 text-gray-400" />
                      {selectedUser.phone || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                    {selectedUser.address || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  handleUserAction(selectedUser, "edit");
                }}
                className="px-4 py-2 bg-[#20319D] rounded-md text-white hover:bg-blue-800 flex items-center"
              >
                <FaEdit className="mr-1" /> Edit User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default User;
