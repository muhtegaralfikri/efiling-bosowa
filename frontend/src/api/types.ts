export interface OcrPreviewResponse {
  letterNumber: string | null;
  candidates: string[];
  tanggalSurat: string | null;
  namaPengirim: string | null;
  alamatPengirim?: string | null;
  teleponPengirim?: string | null;
  namaPenerima?: string | null;
  senderConfidence: 'high' | 'medium' | 'low';
  senderSource: 'header' | 'signature' | 'ai' | null;
  perihal: string | null;
  nominalList: number[];
  totalNominal: number;
  ocrRawText: string;
  extractionMethod?: 'ai' | 'regex';
}

export interface OcrPreviewEnqueueResponse {
  jobId: string;
}

export interface OcrPreviewJobStatusResponse {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress?: unknown;
  createdAt: number;
  result?: OcrPreviewResponse;
  error?: string;
}

export interface Letter {
  id: string;
  letterNumber: string;
  jenisSurat: 'MASUK' | 'KELUAR';
  jenisDokumen: 'SURAT' | 'INVOICE' | 'INTERNAL_MEMO' | 'PAD';
  unitBisnis: 'BOSOWA_TAXI' | 'OTORENTAL_NUSANTARA' | 'OTO_GARAGE_INDONESIA' | 'MALLOMO' | 'LAGALIGO_LOGISTIK' | 'PORT_MANAGEMENT';
  tanggalSurat: string;
  namaPengirim?: string | null;
  alamatPengirim?: string | null;
  teleponPengirim?: string | null;
  perihal?: string | null;
  totalNominal: number;
  fileId?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Signature {
  id: string;
  userId: string;
  imagePath: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureRequest {
  id: string;
  letterId: string;
  letter?: Letter;
  requestedBy: string;
  requester?: { id: string; username: string };
  assignedTo: string;
  assignee?: { id: string; username: string };
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  positionX: number | null;
  positionY: number | null;
  positionPage: number | null;
  signedAt: string | null;
  signedImagePath: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'SIGNATURE_REQUEST' | 'SIGNATURE_COMPLETED' | 'SIGNATURE_REJECTED';
  title: string;
  message: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'MANAJEMEN' | 'USER';
  unitBisnis?: 'BOSOWA_TAXI' | 'OTORENTAL_NUSANTARA' | 'OTO_GARAGE_INDONESIA' | 'MALLOMO' | 'LAGALIGO_LOGISTIK' | 'PORT_MANAGEMENT' | null;
  createdAt: string;
}
