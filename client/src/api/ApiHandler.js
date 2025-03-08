import axios from "axios";

const BASE_URL = "http://localhost:8000/api";

class ApiHandler {
  constructor(baseURL = BASE_URL) {
    this.api = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.loadToken(); // Load token on initialization
  }

  // Set JWT token in API headers
  setAuthToken(token) {
    if (token) {
      console.log("Setting token:", token);
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      console.log("Removing token");
      delete this.api.defaults.headers.common["Authorization"];
    }
  }

  // Load token from localStorage and set it in headers
  loadToken() {
    try {
      const token = localStorage.getItem("jwtToken");
      if (token) this.setAuthToken(token);
    } catch (error) {
      console.error("Failed to load token:", error);
    }
  }

  // Save token to localStorage and update headers
  saveToken(token) {
    try {
      localStorage.setItem("jwtToken", token);
      this.setAuthToken(token);
    } catch (error) {
      console.error("Failed to save token:", error);
    }
  }

  // Remove token from localStorage and headers
  removeToken() {
    try {
      localStorage.removeItem("jwtToken");
      this.setAuthToken(null);
    } catch (error) {
      console.error("Failed to remove token:", error);
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    try {
      const response = await this.api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // POST request
  async post(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // PUT request
  async put(endpoint, data) {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // DELETE request
  async delete(endpoint) {
    try {
      const response = await this.api.delete(endpoint);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Handle errors
  handleError(error) {
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
