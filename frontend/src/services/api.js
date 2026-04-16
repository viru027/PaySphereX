// ============================================================
// src/services/api.js  — Axios instance with interceptors
// ============================================================
import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL:  "/api/v1",
  timeout: 30000,
  withCredentials: true,
});

// Request: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failQueue    = [];

const processQueue = (error, token = null) => {
  failQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failQueue = [];
};

// Response: auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const { data } = await api.post("/auth/refresh");
        const token    = data.data.accessToken;
        localStorage.setItem("accessToken", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        processQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast for non-auth errors
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || "Something went wrong";
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// ── API service helpers ──────────────────────────────────
export const authAPI = {
  login:  (d)  => api.post("/auth/login", d),
  logout: ()   => api.post("/auth/logout"),
  me:     ()   => api.get("/auth/me"),
  changePassword: (d) => api.patch("/auth/change-password", d),
};

export const employeeAPI = {
  getAll:    (p) => api.get("/employees", { params: p }),
  getOne:    (id)=> api.get(`/employees/${id}`),
  create:    (d) => api.post("/employees", d),
  update:    (id,d)=> api.put(`/employees/${id}`, d),
  deactivate:(id)=> api.patch(`/employees/${id}/deactivate`),
};

export const payrollAPI = {
  process:          (d)  => api.post("/payroll/process", d),
  getRuns:          ()   => api.get("/payroll/runs"),
  getPayslips:      (p)  => api.get("/payroll/payslips", { params: p }),
  getPayslipPDFUrl: (id) => `${api.defaults.baseURL}/payroll/payslips/${id}/pdf`,
  getSalaryStructure:(id)=> api.get(`/payroll/salary/${id}`),
  updateSalary:     (id,d)=> api.put(`/payroll/salary/${id}`, d),
};

export const leaveAPI = {
  apply:      (d)  => api.post("/leaves/apply", d),
  review:     (id,d)=> api.patch(`/leaves/${id}/review`, d),
  cancel:     (id) => api.patch(`/leaves/${id}/cancel`),
  getAll:     (p)  => api.get("/leaves", { params: p }),
  getTypes:   ()   => api.get("/leaves/types"),
  getBalance: (id) => api.get(id ? `/leaves/balance/${id}` : "/leaves/balance"),
  getSummary: (p)  => api.get("/leaves/summary", { params: p }),
};

export const attendanceAPI = {
  checkIn:    (d)  => api.post("/attendance/check-in", d),
  checkOut:   (d)  => api.post("/attendance/check-out", d),
  getAll:     (p)  => api.get("/attendance", { params: p }),
  getSummary: (p)  => api.get("/attendance/summary", { params: p }),
  bulk:       (d)  => api.post("/attendance/bulk", d),
};

export const analyticsAPI = {
  dashboard:    ()  => api.get("/analytics/dashboard"),
  payroll:      (p) => api.get("/analytics/payroll", { params: p }),
  leave:        (p) => api.get("/analytics/leave", { params: p }),
  attendance:   (p) => api.get("/analytics/attendance", { params: p }),
  attrition:    ()  => api.get("/analytics/attrition"),
  anomalies:    (p) => api.get("/analytics/anomalies", { params: p }),
};

export const departmentAPI = {
  getAll:  ()    => api.get("/departments"),
  create:  (d)   => api.post("/departments", d),
  update:  (id,d)=> api.put(`/departments/${id}`, d),
};

export default api;
