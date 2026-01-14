// import axios from "axios";

// export const api = axios.create({
//   baseURL: "http://localhost:3000",
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("jwt");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

// מוסיף Authorization: Bearer <jwt>
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// אם קיבלנו 401 - מוחקים טוקן
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem("jwt");
    }
    return Promise.reject(err);
  }
);

export default api;