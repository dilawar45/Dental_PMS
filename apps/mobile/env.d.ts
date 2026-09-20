declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL?: string;
    readonly EXPO_PUBLIC_DEFAULT_CLINIC_ID?: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
