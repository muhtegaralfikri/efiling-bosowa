import api from './client';
import type { Signature, SignatureRequest, Notification, User } from './types';

// Signatures API
export const getMySignatures = () => api.get<Signature[]>('/signatures').then((res) => res.data);

export const uploadSignature = (file: File, isDefault = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isDefault', String(isDefault));
  return api.post<Signature>('/signatures/upload', formData).then((res) => res.data);
};

export const drawSignature = (base64Image: string, isDefault = false) =>
  api.post<Signature>('/signatures/draw', { base64Image, isDefault }).then((res) => res.data);

export const setDefaultSignature = (id: string) =>
  api.put<Signature>(`/signatures/${id}/default`).then((res) => res.data);

export const deleteSignature = (id: string) => api.delete(`/signatures/${id}`);

// Signature Requests API
export const getMySignatureRequests = (status?: string) =>
  api
    .get<SignatureRequest[]>('/signature-requests', { params: { status } })
    .then((res) => res.data);

export const getPendingSignatures = () =>
  api.get<SignatureRequest[]>('/signature-requests/pending').then((res) => res.data);

export const getSignatureRequestsByLetter = (letterId: string) =>
  api.get<SignatureRequest[]>(`/signature-requests/by-letter/${letterId}`).then((res) => res.data);

export const getSignatureRequest = (id: string) =>
  api.get<SignatureRequest>(`/signature-requests/${id}`).then((res) => res.data);

export interface SignatureAssignment {
  assignedTo: string;
  positionX?: number;
  positionY?: number;
  positionPage?: number;
}

export const createSignatureRequest = (
  letterId: string,
  assignments: SignatureAssignment[],
  notes?: string,
) =>
  api
    .post<SignatureRequest[]>('/signature-requests', { letterId, assignments, notes })
    .then((res) => res.data);

export const getSharedSignedDocument = (letterId: string) =>
  api.get<string>(`/signature-requests/shared-signed/${letterId}`).then((res) => res.data);

export const signDocument = (
  requestId: string,
  signatureId?: string,
  positionX?: number,
  positionY?: number,
  scale?: number,
) => api.put<SignatureRequest>(`/signature-requests/${requestId}/sign`, { 
  signatureId, 
  positionX, 
  positionY,
  scale,
}).then((res) => res.data);

export const rejectSignatureRequest = (requestId: string, notes?: string) =>
  api.put<SignatureRequest>(`/signature-requests/${requestId}/reject`, { notes }).then((res) => res.data);

export const cancelSignatureRequest = (requestId: string) =>
  api.delete(`/signature-requests/${requestId}`);

// Notifications API
export const getNotifications = () =>
  api.get<Notification[]>('/notifications').then((res) => res.data);

export const getUnreadCount = () =>
  api.get<number>('/notifications/unread-count').then((res) => res.data);

export const markAsRead = (id: string) =>
  api.put<Notification>(`/notifications/${id}/read`).then((res) => res.data);

export const markAllAsRead = () => api.put('/notifications/read-all');

// Users API (for tagging)
export const getManajemenUsers = () =>
  api.get<User[]>('/users', { params: { role: 'MANAJEMEN' } }).then((res) => res.data);
