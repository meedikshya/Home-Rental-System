import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./pages/Login/LoginForm.js";
import { RegisterForm } from "./pages/Signup/RegisterForm.js";
import WelcomePage from "./pages/Home/WelcomePage.js";
import { auth } from "./services/Firebase-config.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSessionTimeout } from "./hooks/userSessionTimeout.js";

function App() {
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user details from local storage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Handle auth state change
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // Optionally fetch more user details from your backend
        // For now, just set the user from local storage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => unsubscribe();
  }, []);

  const register = async () => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(
        registerEmail,
        registerPassword
      );
      const userData = { email: userCredential.user.email };
      // Save user details to local storage
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Registration successful!");
      setUser(userData);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const login = async () => {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        loginEmail,
        loginPassword
      );
      const userData = { email: userCredential.user.email };
      // Save user details to local storage
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Login successful!");
      setUser(userData);
    } catch (error) {
      toast.error("Invalid email or password");
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("JWTToken");
      toast.success("Logged out successfully!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <HashRouter>
      <div className="flex w-full h-screen">
        <div className="w-full flex items-center justify-center lg:w-1.5/2">
          <Routes>
            <Route
              path="/"
              element={
                <LoginForm
                  loginEmail={loginEmail}
                  loginPassword={loginPassword}
                  setLoginEmail={setLoginEmail}
                  setLoginPassword={setLoginPassword}
                  login={login}
                />
              }
            />
            <Route
              path="/register"
              element={
                <RegisterForm
                  registerEmail={registerEmail}
                  registerPassword={registerPassword}
                  setRegisterEmail={setRegisterEmail}
                  setRegisterPassword={setRegisterPassword}
                  register={register}
                />
              }
            />
            <Route
              path="/home"
              element={<WelcomePage user={user} logout={logout} />}
            />
          </Routes>
          <ToastContainer />
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
