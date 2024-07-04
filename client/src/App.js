import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./pages/Login/LoginForm.js";
import { RegisterForm } from "./pages/Signup/RegisterForm.js";
import { WelcomePage } from "./pages/Home/WelcomePage.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./services/Firebase-config.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ? currentUser : null);
    });
    return () => unsubscribe();
  }, []);

  const register = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      setUser(userCredential.user);
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        loginPassword
      );
      setUser(userCredential.user);
      return true;
    } catch (error) {
      toast.error("Invalid email or password");
      return false;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
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
            <Route path="/home" element={<WelcomePage user={user} />} />
          </Routes>
          <ToastContainer />
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
