/**
 * react-native-config TypeScript 타입 정의
 */

declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    AGORA_APP_ID?: string;
    [key: string]: string | undefined;
  }

  export const Config: NativeConfig;
  export default Config;
}
