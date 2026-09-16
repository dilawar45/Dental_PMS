/**
 * Provider mode — selects which implementation to use.
 * "mock" = dev-safe, logs to dev_outbox, no network.
 * "real" = production stubs (will throw until configured).
 */
export type ProviderMode = 'mock' | 'real';

/**
 * All provider env var names mapped to their expected values.
 */
export interface ProviderEnvVars {
  WHATSAPP_PROVIDER: ProviderMode;
  VOICE_PROVIDER: ProviderMode;
  SOCIAL_PROVIDER: ProviderMode;
  STORAGE_PROVIDER: ProviderMode;
  PDF_PROVIDER: ProviderMode;
  AI_PROVIDER: ProviderMode;
}
