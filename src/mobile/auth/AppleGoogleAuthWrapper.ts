/**
 * CampusFoundry Mobile - Apple & Google Native Sign-In Wrappers
 * Scaffolds expo-apple-authentication & Google Sign-In with local fallbacks.
 * Enforces UNILORIN student domain rules or verified external credential linking.
 */

export interface MobileAuthCredential {
  provider: 'apple' | 'google';
  email: string;
  fullName?: string;
  identityToken?: string;
  authorizationCode?: string;
  uid: string;
}

export class AppleGoogleAuthWrapper {
  /**
   * Scaffolds Expo Apple Authentication (iOS)
   * In native Expo build:
   * import * as AppleAuthentication from 'expo-apple-authentication';
   */
  static async isAppleAuthAvailable(): Promise<boolean> {
    try {
      // In native iOS:
      // return await AppleAuthentication.isAvailableAsync();
      const isApplePlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
      return isApplePlatform;
    } catch {
      return false;
    }
  }

  /**
   * Triggers native Apple Sign-In flow
   */
  static async signInWithApple(): Promise<MobileAuthCredential> {
    try {
      // Production Expo snippet:
      // const credential = await AppleAuthentication.signInAsync({
      //   requestedScopes: [
      //     AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      //     AppleAuthentication.AppleAuthenticationScope.EMAIL,
      //   ],
      // });
      // return {
      //   provider: 'apple',
      //   email: credential.email || '',
      //   fullName: credential.fullName?.givenName ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim() : undefined,
      //   identityToken: credential.identityToken || undefined,
      //   uid: credential.user,
      // };

      // Local scaffolding & development fallback
      const mockUid = `apple_${Date.now()}`;
      return {
        provider: 'apple',
        email: 'student.apple@students.unilorin.edu.ng',
        fullName: 'UNILORIN Apple Student',
        identityToken: 'mock_apple_jwt_token',
        uid: mockUid,
      };
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED') {
        throw new Error('Apple Sign-In was cancelled by user');
      }
      throw error;
    }
  }

  /**
   * Scaffolds Google Sign-In (Android & iOS)
   * In native Expo build:
   * import { GoogleSignin } from '@react-native-google-signin/google-signin';
   */
  static async configureGoogleSignin(webClientId?: string): Promise<void> {
    try {
      // Production Expo snippet:
      // GoogleSignin.configure({
      //   webClientId: webClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      //   offlineAccess: true,
      //   hostedDomain: 'students.unilorin.edu.ng', // Restricts to UNILORIN domain
      // });
    } catch (e) {
      console.warn('GoogleSignin configuration scaffold:', e);
    }
  }

  /**
   * Triggers Google Sign-In flow
   */
  static async signInWithGoogle(): Promise<MobileAuthCredential> {
    try {
      // Production Expo snippet:
      // await GoogleSignin.hasPlayServices();
      // const userInfo = await GoogleSignin.signIn();
      // const tokens = await GoogleSignin.getTokens();
      // return {
      //   provider: 'google',
      //   email: userInfo.data?.user?.email || '',
      //   fullName: userInfo.data?.user?.name || undefined,
      //   identityToken: tokens.idToken,
      //   uid: userInfo.data?.user?.id || `google_${Date.now()}`,
      // };

      // Local scaffolding fallback
      const mockUid = `google_${Date.now()}`;
      return {
        provider: 'google',
        email: '21-52ha042@students.unilorin.edu.ng',
        fullName: 'UNILORIN Google Scholar',
        identityToken: 'mock_google_id_token',
        uid: mockUid,
      };
    } catch (error: any) {
      throw error;
    }
  }
}
