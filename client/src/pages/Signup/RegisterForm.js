import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";
import bcrypt from "bcryptjs";

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Password validation state (hidden from UI until submission)
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Password strength state (used internally)
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Validate password on each change (for internal state only)
  useEffect(() => {
    if (!registerPassword) {
      setPasswordValidation({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
      setPasswordStrength(0);
      return;
    }

    const validation = {
      hasMinLength: registerPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(registerPassword),
      hasLowerCase: /[a-z]/.test(registerPassword),
      hasNumber: /[0-9]/.test(registerPassword),
      hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(
        registerPassword
      ),
    };

    setPasswordValidation(validation);

    // Calculate password strength (0-5)
    const strength = Object.values(validation).filter(Boolean).length;
    setPasswordStrength(strength);
  }, [registerPassword]);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");

    if (!registerEmail.trim() || !registerPassword.trim()) {
      if (!registerEmail.trim()) setEmailError("Email is required.");
      if (!registerPassword.trim()) setPasswordError("Password is required.");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(registerEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    // Facebook-style password validation - only show errors on submission
    if (passwordStrength < 3) {
      // Simple one-line error message
      setPasswordError(
        "Your password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character."
      );
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Hash the password before sending to backend
      // Use 10 rounds for salt generation (standard secure practice)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(registerPassword, salt);

      //  Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        registerEmail,
        registerPassword
      );

      const firebaseUserId = userCredential.user.uid;
      console.log("Firebase user created with ID:", firebaseUserId);

      await setDoc(doc(FIREBASE_DB, "users", firebaseUserId), {
        email: registerEmail,
        userRole: "Landlord",
        firebaseUId: firebaseUserId,
        createdAt: new Date(),
      });
      console.log("User data saved to Firestore");

      const response = await ApiHandler.post("/Users", {
        email: registerEmail,
        passwordHash: hashedPassword, // Send properly hashed password
        userRole: "Landlord",
        firebaseUId: firebaseUserId,
      });

      console.log("Backend API response:", response);

      if (response && response.userId) {
        sessionStorage.setItem("justRegistered", "true");
        toast.success("Registration successful! Please complete your profile.");
        navigate(`/userinfo/${response.userId}`);
        setRegisterEmail("");
        setRegisterPassword("");
      } else {
        throw new Error("Unexpected API response format.");
      }
    } catch (error) {
      console.error("Error registering user:", error);

      if (error.code === "auth/email-already-in-use") {
        setEmailError("This email is already registered.");
        toast.error("This email address is already in use.");
      } else if (error.code === "auth/weak-password") {
        setPasswordError("Please choose a stronger password.");
        toast.error("Please choose a stronger password.");
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
        toast.error("Please enter a valid email address.");
      } else {
        toast.error(`Registration error: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="px-10 py-8 text-2xl font-semibold text-center border-b">
          Create new account
        </h1>
        <div className="bg-white px-10 py-10">
          <form onSubmit={handleRegister}>
            <div>
              <label className="text-sm font-medium">Email address</label>
              <input
                className={`w-full border-2 border-gray-100 p-2 mt-3 mb-4 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                  emailError ? "border-red-500" : ""
                }`}
                placeholder="abc@gmail.com"
                onChange={(event) => {
                  setRegisterEmail(event.target.value);
                  setEmailError("");
                }}
                value={registerEmail}
                autoComplete="email"
              />
              {emailError && (
                <div className="text-red-500 mt-1 text-xs">{emailError}</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                className={`w-full border-2 border-gray-100 p-2 mt-3 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                  passwordError ? "border-red-500" : ""
                }`}
                placeholder="password"
                type="password"
                onChange={(event) => {
                  setRegisterPassword(event.target.value);
                  setPasswordError("");
                }}
                value={registerPassword}
                autoComplete="new-password"
              />

              {/* Facebook-style one-line error message only shown when needed */}
              {passwordError && (
                <div className="text-red-500 mt-2 text-xs">{passwordError}</div>
              )}
            </div>
            <div className="mt-8 flex flex-col gap-y-4">
              <button
                type="submit"
                className="py-2 bg-indigo-600 text-white text-lg rounded-md hover:bg-indigo-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Sign up"
                )}
              </button>
            </div>
          </form>
          <div className="mt-5 text-center">
            <p>
              Already have an account?{" "}
              <button
                onClick={handleLogin}
                className="font-bold text-sm text-indigo-600 hover:text-indigo-800"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
