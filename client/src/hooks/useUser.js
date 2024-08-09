//useUser.js
import { useState } from "react";

const useUser = () => {
  const [user, setUser] = useState(() => {
    // Initialize user from session storage
    const storedUserEmail = sessionStorage.getItem("userEmail");
    const storedUserRole = sessionStorage.getItem("userRole");
    return storedUserEmail && storedUserRole
      ? { email: storedUserEmail, role: storedUserRole }
      : null;
  });

  const login = (userDetails) => {
    setUser(userDetails);
    sessionStorage.setItem("userEmail", userDetails.email);
    sessionStorage.setItem("userRole", userDetails.role);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("userRole");
  };

  return { user, login, logout };
};

export default useUser;
