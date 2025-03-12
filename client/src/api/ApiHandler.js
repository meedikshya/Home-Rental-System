import axios from "axios";
import { getAuth, signOut } from "firebase/auth";
import { toast } from "react-toastify";

const BASE_URL = "http://localhost:8000/api";

class ApiHandler {
  constructor(baseURL = BASE_URL) {
    this.api = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.loadToken();
  }

  setAuthToken(token) {
    if (token) {
      console.log("Setting token:", token);
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      console.log("Removing token");
      delete this.api.defaults.headers.common["Authorization"];
    }
  }

  loadToken() {
    try {
      const token = localStorage.getItem("jwtToken");
      if (token) this.setAuthToken(token);
    } catch (error) {
      console.error("Failed to load token:", error);
    }
  }

  saveToken(token) {
    try {
      localStorage.setItem("jwtToken", token);
      this.setAuthToken(token);
    } catch (error) {
      console.error("Failed to save token:", error);
    }
  }

  removeToken() {
    try {
      localStorage.removeItem("jwtToken");
      this.setAuthToken(null);
    } catch (error) {
      console.error("Failed to remove token:", error);
    }
  }

  async get(endpoint, params = {}) {
    try {
      const response = await this.api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async post(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async put(endpoint, data) {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(endpoint) {
    try {
      const response = await this.api.delete(endpoint);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized access (401). Token has expired.");

      toast.error("Your session has expired. Please login again.", {
        position: "top-center",
        autoClose: 3000,
      });

      this.removeToken();
      localStorage.removeItem("user");

      const auth = getAuth();
      signOut(auth).catch((err) => console.error("Error signing out:", err));

      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);

      return null;
    }

    if (error.response) {
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      console.error("Network Error:", error.request);
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
}

export default new ApiHandler();
