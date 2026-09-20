import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'dental_pms_patient_auth';

export interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  allergies?: string[];
  medical_alerts?: string[];
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  clinic_id: string;
}

export interface ClinicSelection {
  id: string;
  name: string;
}

interface StoredAuthData {
  token: string | null;
  patient: PatientProfile | null;
  clinic: ClinicSelection | null;
}

export interface AuthState {
  token: string | null;
  patient: PatientProfile | null;
  clinic: ClinicSelection | null;
  isHydrated: boolean;
  setAuth: (payload: { token: string; patient: PatientProfile; clinic?: ClinicSelection }) => Promise<void>;
  setClinic: (clinic: ClinicSelection) => Promise<void>;
  setPatient: (patient: PatientProfile) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persistData(data: StoredAuthData): Promise<void> {
  const json = JSON.stringify(data);
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, json);
      }
    } catch {
      // ignore web storage errors
    }
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, json);
}

async function retrieveData(): Promise<StoredAuthData | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthData;
  } catch {
    return null;
  }
}

async function removeData(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  patient: null,
  clinic: null,
  isHydrated: false,

  setAuth: async ({ token, patient, clinic }) => {
    const currentClinic = clinic ?? get().clinic;
    set({ token, patient, clinic: currentClinic });
    await persistData({
      token,
      patient,
      clinic: currentClinic,
    });
  },

  setClinic: async (clinic) => {
    const current = get();
    set({ clinic });
    await persistData({
      token: current.token,
      patient: current.patient,
      clinic,
    });
  },

  setPatient: async (patient) => {
    const current = get();
    set({ patient });
    await persistData({
      token: current.token,
      patient,
      clinic: current.clinic,
    });
  },

  clearAuth: async () => {
    const current = get();
    set({ token: null, patient: null });
    await persistData({
      token: null,
      patient: null,
      clinic: current.clinic,
    });
    await removeData();
  },

  hydrate: async () => {
    try {
      const data = await retrieveData();
      if (data) {
        set({
          token: data.token,
          patient: data.patient,
          clinic: data.clinic,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },
}));
