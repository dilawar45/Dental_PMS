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

  if (response.status === 401) {
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
};
