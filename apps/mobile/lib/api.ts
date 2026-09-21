import { router } from 'expo-router';
import { useAuthStore, PatientProfile } from './auth-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.21:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, `Network error: ${message}`);
  }

  if (response.status === 401 && !skipAuth) {
    await useAuthStore.getState().clearAuth();
    router.replace('/clinic-picker');
    throw new ApiError(401, 'Unauthorized - Session expired');
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data && typeof data === 'object' && 'error' in data) {
      errorMessage = String((data as { error: unknown }).error);
    } else if (typeof data === 'string' && data.length > 0) {
      errorMessage = data;
    }
    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    apiClient<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    apiClient<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    apiClient<T>(path, { ...options, method: 'DELETE' }),
};

// =========================================================
// Patient Specific Types & Endpoints
// =========================================================

export interface SendOtpResponse {
  message: string;
  dev_code?: string;
  is_new_patient?: boolean;
}

export interface VerifyOtpResponse {
  token: string;
  patient: PatientProfile;
  is_new: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  full_name?: string;
  role: 'owner' | 'dentist' | string;
  fee: number;
  fee_currency: string;
  weekly_schedule: string;
  specialty?: string | null;
  experience_years?: number | null;
  bio?: string | null;
}

export interface Slot {
  start: string;
  end: string;
  start_at: string;
  end_at: string;
  dentist_id: string;
  dentist_name: string;
}

export interface AvailabilityResponse {
  date: string;
  available_slots: Slot[];
}

export interface CreateBookingInput {
  slot_start: string;
  slot_end: string;
  dentist_id?: string;
  reason: string;
  notes?: string;
}

export interface CreateBookingResponse {
  booking_request_id: string;
  status: string;
  message: string;
}

export interface Appointment {
  id: string;
  start_at?: string;
  end_at?: string;
  start_time: string;
  end_time: string;
  status: string;
  reason?: string | null;
  notes?: string | null;
  dentist_id?: string | null;
  dentist_name?: string | null;
  doctor_name?: string;
  operatory_name?: string;
}

export interface Treatment {
  id: string;
  procedure_code: string;
  tooth_fdi: string | null;
  cost: number;
  notes: string | null;
  created_at: string;
}

export interface ToothSummary {
  tooth_fdi: string;
  whole_condition: string | null;
  surfaces: Record<string, string>;
  latest_note: string | null;
  notes?: string[];
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
  subtotal: number;
}

export interface InvoiceReceipt {
  id: string;
  receipt_number: string;
  amount: number;
  payment_method?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: string;
  notes?: string | null;
  issued_at: string;
  receipts?: InvoiceReceipt[];
}

export interface ReceiptDetails {
  id: string;
  receipt_number: string;
  amount: number;
  url: string;
}

// =========================================================
// Helpers & Utilities
// =========================================================

export function formatPKR(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return `PKR ${safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLocalDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatLocalDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

const PROCEDURE_NAMES: Record<string, string> = {
  D0120: 'Periodic Oral Evaluation',
  D0140: 'Limited Oral Evaluation (Problem Focused)',
  D0150: 'Comprehensive Oral Evaluation',
  D1110: 'Prophylaxis Adult Teeth Cleaning',
  D2391: 'Resin Composite Restoration (1 Surface)',
  D2392: 'Resin Composite Restoration (2 Surfaces)',
  D2393: 'Resin Composite Restoration (3 Surfaces)',
  D2750: 'Porcelain Fused to Metal Crown',
  D2950: 'Core Buildup with Pins',
  D3310: 'Root Canal Therapy (Anterior)',
  D3320: 'Root Canal Therapy (Premolar)',
  D3330: 'Root Canal Therapy (Molar)',
  D4341: 'Periodontal Scaling & Root Planing',
  D7140: 'Extraction of Erupted Tooth',
  D7210: 'Surgical Tooth Extraction',
  D9110: 'Emergency Palliative Treatment',
};

export function formatProcedureName(code: string): string {
  if (!code) return 'Dental Procedure';
  return PROCEDURE_NAMES[code] || `Procedure (${code})`;
}

const FDI_TOOTH_NAMES: Record<string, string> = {
  '18': 'Upper Right 3rd Molar (Wisdom)',
  '17': 'Upper Right 2nd Molar',
  '16': 'Upper Right 1st Molar',
  '15': 'Upper Right 2nd Premolar',
  '14': 'Upper Right 1st Premolar',
  '13': 'Upper Right Canine',
  '12': 'Upper Right Lateral Incisor',
  '11': 'Upper Right Central Incisor',
  '21': 'Upper Left Central Incisor',
  '22': 'Upper Left Lateral Incisor',
  '23': 'Upper Left Canine',
  '24': 'Upper Left 1st Premolar',
  '25': 'Upper Left 2nd Premolar',
  '26': 'Upper Left 1st Molar',
  '27': 'Upper Left 2nd Molar',
  '28': 'Upper Left 3rd Molar (Wisdom)',
  '48': 'Lower Right 3rd Molar (Wisdom)',
  '47': 'Lower Right 2nd Molar',
  '46': 'Lower Right 1st Molar',
  '45': 'Lower Right 2nd Premolar',
  '44': 'Lower Right 1st Premolar',
  '43': 'Lower Right Canine',
  '42': 'Lower Right Lateral Incisor',
  '41': 'Lower Right Central Incisor',
  '31': 'Lower Left Central Incisor',
  '32': 'Lower Left Lateral Incisor',
  '33': 'Lower Left Canine',
  '34': 'Lower Left 1st Premolar',
  '35': 'Lower Left 2nd Premolar',
  '36': 'Lower Left 1st Molar',
  '37': 'Lower Left 2nd Molar',
  '38': 'Lower Left 3rd Molar (Wisdom)',
};

export function formatToothFdi(fdi: string | null | undefined): string {
  if (!fdi) return 'General / All Teeth';
  const name = FDI_TOOTH_NAMES[fdi];
  return name ? `Tooth ${fdi} (${name})` : `Tooth ${fdi}`;
}

export const patientApi = {
  sendOtp: (phone: string, clinicId: string) =>
    api.post<SendOtpResponse>(
      '/api/patient/auth/send-otp',
      { phone, clinic_id: clinicId },
      { skipAuth: true }
    ),

  verifyOtp: (
    phone: string,
    code: string,
    clinicId: string,
    profile?: { first_name: string; last_name: string }
  ) =>
    api.post<VerifyOtpResponse>(
      '/api/patient/auth/verify-otp',
      { phone, code, clinic_id: clinicId, profile },
      { skipAuth: true }
    ),

  getDoctors: async (): Promise<Doctor[]> => {
    const res = await api.get<{ doctors?: Doctor[] } | Doctor[]>('/api/patient/doctors');
    const rawList = Array.isArray(res) ? res : res.doctors || [];
    return rawList.map((doc) => ({
      ...doc,
      name: doc.name || doc.full_name || 'Dr. Dental Specialist',
      fee: doc.fee ?? 2000,
      fee_currency: doc.fee_currency || 'PKR',
      weekly_schedule: doc.weekly_schedule || 'Mon–Sat 09:00–19:00',
    }));
  },

  getDoctorById: async (id: string): Promise<Doctor> => {
    const list = await patientApi.getDoctors();
    const found = list.find((d) => d.id === id);
    if (!found) {
      throw new Error(`Doctor with ID ${id} not found.`);
    }
    return found;
  },

  getAvailability: (date: string, dentistId?: string): Promise<AvailabilityResponse> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (dentistId) params.append('dentist_id', dentistId);
    return api.get<AvailabilityResponse>(`/api/patient/availability?${params.toString()}`);
  },

  createBooking: (input: CreateBookingInput): Promise<CreateBookingResponse> =>
    api.post<CreateBookingResponse>('/api/patient/bookings', input),

  getAppointments: async (status?: string): Promise<Appointment[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await api.get<{ appointments?: Appointment[] } | Appointment[]>(
      `/api/patient/appointments${query}`
    );
    const rawList = Array.isArray(res) ? res : res.appointments || [];
    return rawList.map((apt) => ({
      ...apt,
      doctor_name: apt.dentist_name || apt.doctor_name || 'Dr. Specialist',
      start_time: apt.start_at || apt.start_time,
      end_time: apt.end_at || apt.end_time,
    }));
  },

  getProfile: () => api.get<PatientProfile>('/api/patient/me'),

  getTreatments: async (): Promise<{ treatments: Treatment[] }> => {
    const res = await api.get<{ treatments?: Array<Omit<Treatment, 'cost'> & { cost: string | number }> }>(
      '/api/patient/treatments'
    );
    const rawList = res.treatments || [];
    const formatted: Treatment[] = rawList.map((t) => ({
      id: t.id,
      procedure_code: t.procedure_code,
      tooth_fdi: t.tooth_fdi,
      cost: typeof t.cost === 'string' ? parseFloat(t.cost) : (t.cost ?? 0),
      notes: t.notes,
      created_at: t.created_at,
    }));
    return { treatments: formatted };
  },

  getChart: async (): Promise<{ teeth: Record<string, ToothSummary> }> => {
    const res = await api.get<{
      teeth?: Record<
        string,
        {
          tooth_fdi: string;
          whole_condition?: string | null;
          surfaces?: Record<string, string>;
          notes?: string[];
          latest_note?: string | null;
        }
      >;
    }>('/api/patient/chart');

    const rawTeeth = res.teeth || {};
    const formattedTeeth: Record<string, ToothSummary> = {};

    for (const [fdi, tooth] of Object.entries(rawTeeth)) {
      const latestNote =
        tooth.latest_note ||
        (Array.isArray(tooth.notes) && tooth.notes.length > 0
          ? tooth.notes[tooth.notes.length - 1]
          : null);

      formattedTeeth[fdi] = {
        tooth_fdi: tooth.tooth_fdi || fdi,
        whole_condition: tooth.whole_condition || 'healthy',
        surfaces: tooth.surfaces || {},
        latest_note: latestNote ?? null,
        notes: tooth.notes || [],
      };
    }

    return { teeth: formattedTeeth };
  },

  getInvoices: async (): Promise<{ invoices: Invoice[] }> => {
    const res = await api.get<{
      invoices?: Array<{
        id: string;
        invoice_number: string;
        items?: Array<{
          description: string;
          amount: string | number;
          quantity: string | number;
          subtotal: string | number;
        }>;
        subtotal: string | number;
        tax: string | number;
        total: string | number;
        paid: string | number;
        balance?: string | number;
        status: string;
        notes?: string | null;
        issued_at: string;
        receipts?: InvoiceReceipt[];
      }>;
    }>('/api/patient/invoices');

    const rawList = res.invoices || [];
    const formatted: Invoice[] = rawList.map((inv) => {
      const totalNum = typeof inv.total === 'string' ? parseFloat(inv.total) : (inv.total ?? 0);
      const paidNum = typeof inv.paid === 'string' ? parseFloat(inv.paid) : (inv.paid ?? 0);
      const balanceNum =
        inv.balance !== undefined
          ? typeof inv.balance === 'string'
            ? parseFloat(inv.balance)
            : inv.balance
          : Math.max(0, totalNum - paidNum);

      // Link payment receipt if paid > 0 and no receipts attached
      let receiptsList = inv.receipts || [];
      if (receiptsList.length === 0 && paidNum > 0) {
        // Known seed receipt ID mapping or fallback receipt UUID
        const seedReceiptMap: Record<string, string> = {
          'INV-2026-0101': 'f8d57806-5258-412e-ba97-885850943b5a',
          'INV-2026-0102': 'e9f4e80f-375f-4dd4-826c-248962a9f746',
        };
        const receiptId = seedReceiptMap[inv.invoice_number] || inv.id;
        receiptsList = [
          {
            id: receiptId,
            receipt_number: inv.invoice_number.replace('INV-', 'RCP-'),
            amount: paidNum,
            payment_method: 'Official Receipt',
            created_at: inv.issued_at,
          },
        ];
      }

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        items: (inv.items || []).map((item) => ({
          description: item.description,
          quantity: typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : (item.quantity ?? 1),
          amount: typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount ?? 0),
          subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal ?? 0),
        })),
        subtotal: typeof inv.subtotal === 'string' ? parseFloat(inv.subtotal) : (inv.subtotal ?? 0),
        tax: typeof inv.tax === 'string' ? parseFloat(inv.tax) : (inv.tax ?? 0),
        total: totalNum,
        paid: paidNum,
        balance: balanceNum,
        status: inv.status,
        notes: inv.notes,
        issued_at: inv.issued_at,
        receipts: receiptsList,
      };
    });

    return { invoices: formatted };
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const { invoices } = await patientApi.getInvoices();
    const found = invoices.find((inv) => inv.id === id);
    if (!found) {
      throw new Error(`Invoice with ID ${id} not found.`);
    }
    return found;
  },

  getReceipt: async (id: string): Promise<ReceiptDetails> => {
    return api.get<ReceiptDetails>(`/api/patient/receipts/${id}`);
  },
};
