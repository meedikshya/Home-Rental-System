import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./pages/Login/LoginForm.js";
import { RegisterForm } from "./pages/Signup/RegisterForm.js";
import AdminPanel from "./pages/Admin/AdminPanel.js";
import UserInfo from "./pages/Signup/UserInfo.js";
import Layout from "./components/Landlord/Layout.js";
import Property from "./pages/Landlord/Property.js";
import Home from "./pages/Landlord/Home.js";
import Booking from "./pages/Landlord/Booking.js";
import Chat from "./pages/Landlord/Chat.js";
import ChatPage from "./pages/Landlord/ChatPage.js";
import Payment from "./pages/Landlord/Payment.js";
import AddPropertyDetails from "./components/property/PropertyDetailsForm.js";
import AddPropertyForm from "./components/property/AddPropertyForm.js";
import UploadPropertyImages from "./components/property/PropertyImageUpload.js";
import SessionTimeoutProvider from "./hooks/sessionProvider.js";
import RoleProtectedRoute from "./components/ProtectedRoutes/RoleProtectedRoutes.js";

import { FIREBASE_AUTH } from "./services/Firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (currentUser) => {
      if (currentUser) {
        setUser({ email: currentUser.email });
        localStorage.setItem(
          "user",
          JSON.stringify({ email: currentUser.email })
        );
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      const userData = { email: userCredential.user.email };
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Registration successful!");
      setUser(userData);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      const userData = { email: userCredential.user.email };
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Login successful!");
      setUser(userData);
    } catch (error) {
      toast.error("Invalid email or password");
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm login={login} />} />
        <Route
          path="/register"
          element={<RegisterForm register={register} />}
        />
        <Route path="/adminpanel" element={<AdminPanel />} />
        <Route path="/userinfo/:userId" element={<UserInfo />} />
        <Route
          path="/landlord/*"
          element={
            <RoleProtectedRoute requiredRole="Landlord">
              <Layout>
                <Routes>
                  <Route path="property" element={<Property />} />
                  <Route path="booking" element={<Booking />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="chat/:chatId" element={<ChatPage />} />
                  <Route path="payment" element={<Payment />} />
                  <Route path="home" element={<Home />} />
                  <Route path="addproperty" element={<AddPropertyForm />} />
                  <Route
                    path="/add-property"
                    element={<AddPropertyDetails />}
                  />
                  <Route
                    path="upload-images/:propertyId"
                    element={<UploadPropertyImages />}
                  />
                </Routes>
              </Layout>
            </RoleProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
