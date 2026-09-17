import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { clinics } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';

export const TOOL_NAME = 'get_clinic_info';
export const TOOL_DESCRIPTION =
  'Retrieve clinic operating hours, location, services, pricing, or general practice information.';

export const getClinicInfoInputSchema = z.object({
  topic: z
    .enum(['hours', 'location', 'services', 'pricing', 'general'])
    .default('general')
    .describe('Category of clinic information requested: hours, location, services, pricing, general'),
});

export type GetClinicInfoInput = z.infer<typeof getClinicInfoInputSchema>;

export interface GetClinicInfoOutput {
  topic: string;
  info: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        enum: ['hours', 'location', 'services', 'pricing', 'general'],
        default: 'general',
        description: 'Category of clinic information requested',
      },
    },
  },
};

export async function execute(
  input: GetClinicInfoInput,
  context?: Record<string, unknown>
): Promise<GetClinicInfoOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    const [clinic] = await tx
      .select({
        name: clinics.name,
        address: clinics.address,
        phone: clinics.phone,
        timezone: clinics.timezone,
      })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    const clinicName = clinic?.name || 'Bright Smile Dental';
    const address = clinic?.address || '14-C Gulberg III, MM Alam Road, Lahore, Pakistan';
    const phone = clinic?.phone || '+92 42 35750000';
    const tz = clinic?.timezone || 'Asia/Karachi';

    let info = '';
    switch (input.topic) {
      case 'hours':
        info = `Monday–Saturday, 9:00 AM – 8:00 PM (${tz})`;
        break;

      case 'location':
        info = address;
        break;

      case 'services':
        // Hardcoded standard clinical services.
        // NOTE: In future phases, this should be queried from a dynamic clinic_services catalog table.
        info =
          'General Checkup & Diagnostics, Dental Cleaning & Scaling, Root Canal Treatment (Endodontics), Cosmetic Dentistry (Veneers, Whitening), Emergency Dental Care.';
        break;

      case 'pricing':
        info = 'Please contact reception for pricing';
        break;

      case 'general':
      default:
        info = `${clinicName}
Address: ${address}
Phone: ${phone}
Hours: Monday–Saturday, 9:00 AM – 8:00 PM (${tz})
Services: General checkup, dental cleaning, root canal, cosmetic dentistry, emergency care.
Pricing: Please contact reception for pricing`;
        break;
    }

    return {
      topic: input.topic,
      info,
    };
  });
}
