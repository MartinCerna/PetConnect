import type { CapacitorConfig } from '@capacitor/cli';
import '@capacitor/local-notifications';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  'https://pet-connect-flame.vercel.app/dashboard?app=1';

const config: CapacitorConfig = {
  appId: 'com.petconnect.app',
  appName: 'PetConnect',
  webDir: 'capacitor-shell',
  server: {
    url: serverUrl,
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E11D48',
    },
  },
};

export default config;
