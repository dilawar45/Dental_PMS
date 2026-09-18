import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Staff and clinic user roles.
 */
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'owner',
  'dentist',
  'receptionist',
  'assistant',
]);

/**
 * Clinic lifecycle statuses.
 */
export const clinicStatusEnum = pgEnum('clinic_status', [
  'pending',
  'active',
  'suspended',
  'archived',
]);

/**
 * Patient consent types for compliance and communication.
 */
export const consentTypeEnum = pgEnum('consent_type', [
  'data_processing',
  'marketing',
  'reminders',
]);

/**
 * Appointment lifecycle statuses.
 */
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'confirmed',
  'arrived',
  'completed',
  'no_show',
  'cancelled',
]);

/**
 * Patient slot booking request statuses.
 */
export const bookingRequestStatusEnum = pgEnum('booking_request_status', [
  'pending',
  'approved',
  'rejected',
]);

/**
 * Origin channel for booking requests.
 */
export const bookingRequestChannelEnum = pgEnum('booking_request_channel', [
  'whatsapp',
  'voice',
  'instagram',
  'facebook',
  'google',
  'staff',
]);

/**
 * FDI tooth anatomical surfaces.
 */
export const toothSurfaceEnum = pgEnum('tooth_surface', [
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'occlusal',
  'incisal',
  'whole',
]);

/**
 * Clinical tooth condition diagnosis.
 */
export const toothConditionEnum = pgEnum('tooth_condition', [
  'healthy',
  'caries',
  'filled',
  'crown',
  'missing',
  'implant',
  'rct',
]);

/**
 * Patient asset file categories.
 */
export const fileKindEnum = pgEnum('file_kind', [
  'xray',
  'photo',
  'document',
  'receipt',
]);

/**
 * Supported conversation communication channels.
 */
export const conversationChannelEnum = pgEnum('conversation_channel', [
  'whatsapp',
  'voice',
  'instagram',
  'facebook',
  'google',
]);

/**
 * Real-time conversation thread statuses.
 */
export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'pending_handoff',
  'closed',
]);

/**
 * Message flow direction.
 */
export const messageDirectionEnum = pgEnum('message_direction', [
  'inbound',
  'outbound',
]);

/**
 * Urgency rating for human receptionist handoffs.
 */
export const handoffUrgencyEnum = pgEnum('handoff_urgency', [
  'low',
  'normal',
  'high',
  'emergency',
]);
