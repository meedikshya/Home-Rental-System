import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REACT_APP_BASE_URL } from "@env";

const BASE_URL = REACT_APP_BASE_URL;
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

  // Load token from AsyncStorage and set it in headers
  async loadToken() {
    try {
      const token = await AsyncStorage.getItem("jwtToken");
      if (token) this.setAuthToken(token); // Set token to headers if available
    } catch (error) {
      console.error("Failed to load token:", error);
    }
  }

  // Save token to AsyncStorage and update headers
  async saveToken(token) {
    await AsyncStorage.setItem("jwtToken", token); // Save the token in AsyncStorage
    this.setAuthToken(token); // Update the header with the token
  }

  // Remove token from AsyncStorage and headers
  async removeToken() {
    await AsyncStorage.removeItem("jwtToken");
    this.setAuthToken(null); // Clear token from headers
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
    throw error; // Re-throw the error to be handled elsewhere
  }
}

export default new ApiHandler();
