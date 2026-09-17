/**
 * Patient compliance consent definitions and bilingual legal text snapshots.
 */
export interface ConsentDefinition {
  type: 'data_processing' | 'reminders' | 'marketing';
  title: string;
  urduTitle: string;
  description: string;
  urduDescription: string;
  required: boolean;
  version: string;
  fullSnapshotText: string;
}

export const CONSENT_DEFINITIONS: Record<
  'data_processing' | 'reminders' | 'marketing',
  ConsentDefinition
> = {
  data_processing: {
    type: 'data_processing',
    title: 'Data Processing & Medical Records',
    urduTitle: 'ڈیٹا پروسیسنگ اور طبی ریکارڈز',
    description:
      'I consent to the collection, processing, and clinical record keeping of my dental and medical health information for diagnosis and treatment.',
    urduDescription:
      'میں تشخیص اور علاج کے لیے اپنے دانتوں اور طبی صحت کی معلومات کے جمع، پراسیسنگ اور کلینیکل ریکارڈ رکھنے کی رضامندی دیتا/دیتی ہوں۔',
    required: true,
    version: '1.0.0',
    fullSnapshotText:
      'I consent to the collection, processing, and clinical record keeping of my dental and medical health information for diagnosis and treatment. / میں تشخیص اور علاج کے لیے اپنے دانتوں اور طبی صحت کی معلومات کے جمع، پراسیسنگ اور کلینیکل ریکارڈ رکھنے کی رضامندی دیتا/دیتی ہوں۔ [Version 1.0.0]',
  },
  reminders: {
    type: 'reminders',
    title: 'Appointment Reminders & Follow-ups',
    urduTitle: 'اپائنٹمنٹ یاد دہانیاں اور فالو اپس',
    description:
      'I consent to receiving appointment reminders, scheduling notifications, and clinical follow-ups via SMS, WhatsApp, and email.',
    urduDescription:
      'میں ایس ایم ایس، واٹس ایپ اور ای میل کے ذریعے اپائنٹمنٹ یاد دہانیوں، شیڈولنگ نوٹیفیکیشنز اور کلینیکل فالو اپس وصول کرنے کی رضامندی دیتا/دیتی ہوں۔',
    required: false,
    version: '1.0.0',
    fullSnapshotText:
      'I consent to receiving appointment reminders, scheduling notifications, and clinical follow-ups via SMS, WhatsApp, and email. / میں ایس ایم ایس، واٹس ایپ اور ای میل کے ذریعے اپائنٹمنٹ یاد دہانیوں، شیڈولنگ نوٹیفیکیشنز اور کلینیکل فالو اپس وصول کرنے کی رضامندی دیتا/دیتی ہوں۔ [Version 1.0.0]',
  },
  marketing: {
    type: 'marketing',
    title: 'Practice Announcements & Health Guidance',
    urduTitle: 'پریکٹس اعلانات اور زبانی صحت کی رہنمائی',
    description:
      'I consent to receiving practice updates, seasonal oral hygiene guidance, and promotional announcements from Bright Smile Dental.',
    urduDescription:
      'میں برائٹ سمائل ڈینٹل سے پریکٹس اپ ڈیٹس، موسمی زبانی صحت کی رہنمائی اور پروموشنل اعلانات وصول کرنے کی رضامندی دیتا/دیتی ہوں۔',
    required: false,
    version: '1.0.0',
    fullSnapshotText:
      'I consent to receiving practice updates, seasonal oral hygiene guidance, and promotional announcements from Bright Smile Dental. / میں برائٹ سمائل ڈینٹل سے پریکٹس اپ ڈیٹس، موسمی زبانی صحت کی رہنمائی اور پروموشنل اعلانات وصول کرنے کی رضامندی دیتا/دیتی ہوں۔ [Version 1.0.0]',
  },
};
