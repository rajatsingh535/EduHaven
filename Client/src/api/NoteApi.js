import axiosInstance from "@/utils/axios";

export const getAllNotes = async () => {
  const { data } = await axiosInstance.get("/note");
  return data.data;
};

export const getNoteById = async (id) => {
  const { data } = await axiosInstance.get(`/note/${id}`);
  return data.data;
};

export const createNote = async (noteData) => {
  const { data } = await axiosInstance.post("/note", noteData);
  return data.data;
};

export const updateNote = async ({ id, ...noteData }) => {
  const { data } = await axiosInstance.put(`/note/${id}`, noteData);
  return data.data;
};

export const deleteNote = async (id) => {
  const { data } = await axiosInstance.delete(`/note/${id}`);
  return data.message;
};
