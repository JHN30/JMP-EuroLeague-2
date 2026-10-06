import axios from "axios";

const api = axios.create({
  // Production builds are served by the API itself, so they call it on the same origin.
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:3000/api"),
  withCredentials: true, // send cookies with req
});

export default api;
