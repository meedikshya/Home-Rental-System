import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./pages/Login/LoginForm.js";
import { RegisterForm } from "./pages/Signup/RegisterForm.js";
import UserInfo from "./pages/Signup/UserInfo.js";

// Landlord imports
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

// Admin imports
import LayoutAdmin from "./components/admin/LayoutAdmin.js";
import Agreements from "./pages/Admin/Agreements.js";
import Analytics from "./pages/Admin/Analytics.js";
import Bookings from "./pages/Admin/Bookings.js";
import Dashboard from "./pages/Admin/Dashboard.js";
import Payments from "./pages/Admin/Payments.js";
import Properties from "./pages/Admin/Properties.js";
import AdminPanel from "./pages/Admin/AdminPanel.js";

// Auth and utilities
import SessionTimeoutProvider from "./hooks/sessionProvider.js";
import RoleProtectedRoute from "./components/ProtectedRoutes/RoleProtectedRoutes.js";
import { FIREBASE_AUTH } from "./services/Firebase-config.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  // Remove login and register functions if they're not used or defined elsewhere
  // These aren't actually needed since your LoginForm and RegisterForm components
  // likely handle authentication internally now

  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Routes - remove the props that are causing errors */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/userinfo/:userId" element={<UserInfo />} />

        {/* Admin Routes - Protected by Role */}
        <Route
          path="/admin/*"
          element={
            <RoleProtectedRoute requiredRole="Admin">
              <LayoutAdmin>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="properties" element={<Properties />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="agreements" element={<Agreements />} />
                  {/* Legacy admin panel as fallback */}
                  <Route path="panel" element={<AdminPanel />} />
                  {/* Default admin route - redirect to dashboard */}
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </LayoutAdmin>
            </RoleProtectedRoute>
          }
        />

        {/* Landlord Routes - Protected by Role */}
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
                  <Route path="add-property" element={<AddPropertyDetails />} />
                  <Route
                    path="upload-images/:propertyId"
                    element={<UploadPropertyImages />}
                  />
                </Routes>
              </Layout>
            </RoleProtectedRoute>
          }
        />

        {/* Redirect old adminpanel URL to new dashboard */}
        <Route
          path="/adminpanel"
          element={
            <RoleProtectedRoute requiredRole="Admin">
              <AdminPanel />
            </RoleProtectedRoute>
          }
        />

        {/* Root route - also remove the login prop */}
        <Route path="/" element={<LoginForm />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
