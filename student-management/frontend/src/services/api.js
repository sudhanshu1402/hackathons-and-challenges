import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001/api",
});

export const getStudents = (page = 1, limit = 10, search = "") => {
  return API.get("/students", {
    params: { page, limit, search },
  });
};

export const getStudent = (id) => {
  return API.get(`/students/${id}`);
};

export const createStudent = (data) => {
  return API.post("/students", data);
};

export const updateStudent = (id, data) => {
  return API.put(`/students/${id}`, data);
};

export const deleteStudent = (id) => {
  return API.delete(`/students/${id}`);
};

export const getSubjects = () => {
  return API.get("/subjects");
};

export const createMark = (data) => {
  return API.post("/marks", data);
};

export default API;
