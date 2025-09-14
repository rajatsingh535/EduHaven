// src/queries/noteQuery.js
import {
  createNote,
  deleteNote,
  getAllNotes,
  getNoteById,
  updateNote,
  getAllArchivedNotes,
  archiveNote,
  getAllTrashedNotes,
  trashNote,
  restoreTrashedNote,
} from "@/api/NoteApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Fetch all notes
export const useNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: getAllNotes,
  });
};

// Fetch single note
export const useNote = (id) => {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => getNoteById(id),
    enabled: !!id, // only run if id exists
  });
};

// Create note
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries(["notes"]);
    },
  });
};

// Update note
export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["notes"]);
      queryClient.invalidateQueries(["notes", data._id]);
    },
  });
};

// Delete note
export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries(["notes"]);
    },
  });
};

export const useArchivedNotes = () => {
  return useQuery({
    queryKey: ["archivedNotes"],
    queryFn: getAllArchivedNotes,
  });
};

export const useArchiveNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveNote,
    onSuccess: () => {
      queryClient.invalidateQueries(["notes"]);
      queryClient.invalidateQueries(["archivedNotes"]);
    },
  });
};

// Fetch all trashed notes
export const useTrashedNotes = () => {
  return useQuery({
    queryKey: ["trashedNotes"],
    queryFn: getAllTrashedNotes,
  });
};

// Move note to trash
export const useTrashNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trashNote,
    onSuccess: () => {
      queryClient.invalidateQueries(["notes"]);
      queryClient.invalidateQueries(["archivedNotes"]);
      queryClient.invalidateQueries(["trashedNotes"]);
    },
  });
};

// Restore trashed note
export const useRestoreTrashedNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreTrashedNote,
    onSuccess: () => {
      queryClient.invalidateQueries(["notes"]);
      queryClient.invalidateQueries(["trashedNotes"]);
      queryClient.invalidateQueries(["archivedNotes"]);
    },
  });
};
