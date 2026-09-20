import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  clinics,
  users,
  patients,
  consents,
  appointments,
  bookingRequests,
  chartingEntries,
  treatments,
  files,
  conversations,
  messages,
  calls,
  handoffs,
  invoices,
  receipts,
  broadcasts,
  broadcastRecipients,
  auditLog,
  devOutbox,
  simulatorSessions,
  platformAuditLog,
  clinicInvites,
  patientOtps,
  patientDevices,
} from '@dental-pms/db/schema';

// ─── Table Models (Select / Insert) ──────────────────────────────────────────

export type Clinic = InferSelectModel<typeof clinics>;
export type NewClinic = InferInsertModel<typeof clinics>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Patient = InferSelectModel<typeof patients>;
export type NewPatient = InferInsertModel<typeof patients>;

export type Consent = InferSelectModel<typeof consents>;
export type NewConsent = InferInsertModel<typeof consents>;

export type Appointment = InferSelectModel<typeof appointments>;
export type NewAppointment = InferInsertModel<typeof appointments>;

export type BookingRequest = InferSelectModel<typeof bookingRequests>;
export type NewBookingRequest = InferInsertModel<typeof bookingRequests>;

export type ChartingEntry = InferSelectModel<typeof chartingEntries>;
export type NewChartingEntry = InferInsertModel<typeof chartingEntries>;

export type Treatment = InferSelectModel<typeof treatments>;
export type NewTreatment = InferInsertModel<typeof treatments>;

export type FileRecord = InferSelectModel<typeof files>;
export type NewFileRecord = InferInsertModel<typeof files>;

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type Call = InferSelectModel<typeof calls>;
export type NewCall = InferInsertModel<typeof calls>;

export type Handoff = InferSelectModel<typeof handoffs>;
export type NewHandoff = InferInsertModel<typeof handoffs>;

export type Invoice = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;

export type Receipt = InferSelectModel<typeof receipts>;
export type NewReceipt = InferInsertModel<typeof receipts>;

export type Broadcast = InferSelectModel<typeof broadcasts>;
export type NewBroadcast = InferInsertModel<typeof broadcasts>;

export type BroadcastRecipient = InferSelectModel<typeof broadcastRecipients>;
export type NewBroadcastRecipient = InferInsertModel<typeof broadcastRecipients>;

export type AuditLogEntry = InferSelectModel<typeof auditLog>;
export type NewAuditLogEntry = InferInsertModel<typeof auditLog>;

export type DevOutboxEntry = InferSelectModel<typeof devOutbox>;
export type NewDevOutboxEntry = InferInsertModel<typeof devOutbox>;

export type SimulatorSession = InferSelectModel<typeof simulatorSessions>;
export type NewSimulatorSession = InferInsertModel<typeof simulatorSessions>;

export type PlatformAuditLog = InferSelectModel<typeof platformAuditLog>;
export type NewPlatformAuditLog = InferInsertModel<typeof platformAuditLog>;

export type ClinicInvite = InferSelectModel<typeof clinicInvites>;
export type NewClinicInvite = InferInsertModel<typeof clinicInvites>;

export type PatientOtp = InferSelectModel<typeof patientOtps>;
export type NewPatientOtp = InferInsertModel<typeof patientOtps>;

export type PatientDevice = InferSelectModel<typeof patientDevices>;
export type NewPatientDevice = InferInsertModel<typeof patientDevices>;

// ─── String-Union Enum Types (Derived from Schema Values) ───────────────────

export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'dentist'
  | 'receptionist'
  | 'assistant';

export type ClinicStatus = 'pending' | 'active' | 'suspended' | 'archived';

export type ConsentType = 'data_processing' | 'marketing' | 'reminders';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type BookingRequestStatus = 'pending' | 'approved' | 'rejected';

export type BookingRequestChannel =
  | 'whatsapp'
  | 'voice'
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'staff'
  | 'patient_app';

export type ToothSurface =
  | 'mesial'
  | 'distal'
  | 'buccal'
  | 'lingual'
  | 'occlusal'
  | 'incisal'
  | 'whole';

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'missing'
  | 'implant'
  | 'rct';

export type FileKind = 'xray' | 'photo' | 'document' | 'receipt';

export type ConversationChannel =
  | 'whatsapp'
  | 'voice'
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'patient_app';

export type ConversationStatus = 'open' | 'pending_handoff' | 'closed';

export type MessageFlowDirection = 'inbound' | 'outbound';

export type HandoffUrgency = 'low' | 'normal' | 'high' | 'emergency';
