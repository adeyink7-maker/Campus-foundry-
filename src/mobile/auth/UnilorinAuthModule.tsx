import React, { useState, useEffect } from 'react';
import { BiometricsService } from './BiometricsService';
import { AppleGoogleAuthWrapper } from './AppleGoogleAuthWrapper';
import {
  requestStudentEmailOTP,
  verifyStudentEmailOTP,
  validateUnilorinEmail,
} from '../../services/unilorinAuth';

interface UnilorinAuthModuleProps {
  onAuthSuccess: (userData: {
    uid: string;
    email: string;
    matricNumber: string;
    fullName?: string;
    faculty?: string;
    department?: string;
  }) => void;
  onCancel?: () => void;
}

export const UnilorinAuthModule: React.FC<UnilorinAuthModuleProps> = ({
  onAuthSuccess,
  onCancel,
}) => {
  // Mode: 'EMAIL_ENTRY' | 'OTP_VERIFY' | 'BIOMETRICS_PROMPT'
  const [step, setStep] = useState<'EMAIL_ENTRY' | 'OTP_VERIFY' | 'BIOMETRICS_PROMPT'>('EMAIL_ENTRY');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [biometricType, setBiometricType] = useState<'FACE_ID' | 'FINGERPRINT' | 'NONE'>('FACE_ID');
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  // Check biometric support on mount
  useEffect(() => {
    BiometricsService.getBiometricType().then(setBiometricType);

    // Auto-prompt biometrics if already enabled on this device
    if (BiometricsService.isBiometricsEnabled()) {
      const storedEmail = BiometricsService.getStoredBiometricEmail();
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (step === 'OTP_VERIFY' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  /**
   * Validates student email format strictly against @students.unilorin.edu.ng
   */
  const validateStudentEmail = (rawEmail: string): boolean => {
    const normalized = rawEmail.trim().toLowerCase();
    const domain = normalized.split('@')[1];
    if (domain !== 'students.unilorin.edu.ng') {
      return false;
    }
    const username = normalized.split('@')[0];
    return /^[a-z0-9_-]+$/i.test(username);
  };

  /**
   * Extracts formatted UNILORIN matric number from student email
   * e.g., 21-52ha042@students.unilorin.edu.ng -> 21/52HA042
   */
  const extractMatricNumber = (rawEmail: string): string => {
    const username = rawEmail.trim().toLowerCase().split('@')[0];
    const parts = username.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts.slice(1).join('').toUpperCase()}`;
    }
    return username.toUpperCase();
  };

  /**
   * Handle Requesting OTP
   */
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your UNILORIN student email address.');
      return;
    }

    if (!validateStudentEmail(cleanEmail)) {
      setErrorMessage('Access Restricted: Only official @students.unilorin.edu.ng institutional emails are permitted.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestStudentEmailOTP(cleanEmail);
      setIsLoading(false);

      if (result.success) {
        setStep('OTP_VERIFY');
        setCountdown(60);
        setSuccessMessage('A 6-digit verification code has been dispatched to your official UNILORIN webmail.');
      } else {
        setErrorMessage(result.message || 'Unable to transmit OTP. Please check your network connection.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to connect to UNILORIN Auth Gateway.');
    }
  };

  /**
   * Handle Submitting OTP
   */
  const handleVerifyOTP = async () => {
    setErrorMessage(null);
    const code = otpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyStudentEmailOTP({
        email: email.trim().toLowerCase(),
        otp: code,
        fullName: fullName.trim() || 'UNILORIN Student',
        role: 'student',
      });
      setIsLoading(false);

      if (result.success && result.user) {
        const matric = extractMatricNumber(email);
        const userData = {
          uid: result.user.id,
          email: result.user.email,
          matricNumber: matric,
          fullName: result.user.fullName || fullName || `Student (${matric})`,
          faculty: result.user.faculty || 'Engineering & Technology',
          department: result.user.department || 'Computer Engineering',
        };

        setAuthenticatedUser(userData);
        // Advance to biometrics enrollment screen
        setStep('BIOMETRICS_PROMPT');
      } else {
        setErrorMessage(result.message || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Verification failed. Please retry.');
    }
  };

  /**
   * Handle Biometrics Enrollment Decision
   */
  const handleBiometricsDecision = (enable: boolean) => {
    if (authenticatedUser) {
      BiometricsService.setBiometricsEnabled(enable, authenticatedUser.email);
      onAuthSuccess(authenticatedUser);
    }
  };

  /**
   * Quick Biometric Instant Unlock (if already enrolled)
   */
  const handleBiometricInstantUnlock = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await BiometricsService.authenticateUser();
    setIsLoading(false);

    if (result.success) {
      const storedEmail = BiometricsService.getStoredBiometricEmail() || email || '21-52ha042@students.unilorin.edu.ng';
      const matric = extractMatricNumber(storedEmail);
      onAuthSuccess({
        uid: `biometric_${Date.now()}`,
        email: storedEmail,
        matricNumber: matric,
        fullName: 'Verified UNILORIN Student',
        faculty: 'Physical Sciences',
        department: 'Computer Science',
      });
    } else {
      setErrorMessage(result.error || 'Biometric verification failed.');
    }
  };

  /**
   * Apple / Google Sign-in Handlers
   */
  const handleAppleAuth = async () => {
    setIsLoading(true);
    try {
      const cred = await AppleGoogleAuthWrapper.signInWithApple();
      setIsLoading(false);
      const matric = extractMatricNumber(cred.email);
      onAuthSuccess({
        uid: cred.uid,
        email: cred.email,
        matricNumber: matric,
        fullName: cred.fullName,
      });
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage(e.message);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const cred = await AppleGoogleAuthWrapper.signInWithGoogle();
      setIsLoading(false);
      const matric = extractMatricNumber(cred.email);
      onAuthSuccess({
        uid: cred.uid,
        email: cred.email,
        matricNumber: matric,
        fullName: cred.fullName,
      });
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage(e.message);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 font-bold text-xl border border-amber-500/30 mb-3 shadow-lg shadow-amber-500/10">
          🎓
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">UNILORIN Mobile Access</h2>
        <p className="text-xs text-neutral-400 mt-1">
          {step === 'EMAIL_ENTRY' && 'Institutional Student Gateway & Biometrics'}
          {step === 'OTP_VERIFY' && '6-Digit One-Time Cryptographic Code'}
          {step === 'BIOMETRICS_PROMPT' && 'Secure Device Enclave Enrollment'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
          <span className="text-red-400 font-bold">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* STEP 1: Email Entry */}
      {step === 'EMAIL_ENTRY' && (
        <div>
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Ibrahim Adebayo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Student Email (@students.unilorin.edu.ng)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="21-52ha042@students.unilorin.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Format: <span className="font-mono text-neutral-400">matric@students.unilorin.edu.ng</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isLoading ? 'Requesting OTP...' : 'Send Security OTP →'}
            </button>
          </form>

          {/* Quick Biometric Unlock if available */}
          {BiometricsService.isBiometricsEnabled() && (
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleBiometricInstantUnlock}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-200 transition-colors"
              >
                <span>{biometricType === 'FACE_ID' ? '👤 Face ID' : '👆 Touch ID'} Instant Unlock</span>
              </button>
            </div>
          )}

          {/* Apple & Google Sign-In Scaffold */}
          <div className="mt-5 pt-5 border-t border-neutral-800/80 space-y-2">
            <p className="text-center text-[11px] text-neutral-500 font-medium">Or continue with institutional SSO</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAppleAuth}
                className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-colors"
              >
                <span> Apple</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-colors"
              >
                <span>G Google</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: OTP Verification */}
      {step === 'OTP_VERIFY' && (
        <div>
          <div className="mb-4 text-center">
            <p className="text-xs text-neutral-300">
              Code sent to <span className="font-semibold text-amber-400">{email}</span>
            </p>
          </div>

          {/* 6 Digit Inputs */}
          <div className="flex justify-between gap-2 mb-5">
            {otpCode.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  const newOtp = [...otpCode];
                  newOtp[idx] = val;
                  setOtpCode(newOtp);

                  if (val && idx < 5) {
                    const nextInput = document.getElementById(`otp-input-${idx + 1}`);
                    nextInput?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                    const prevInput = document.getElementById(`otp-input-${idx - 1}`);
                    prevInput?.focus();
                  }
                }}
                className="w-11 h-12 text-center text-lg font-bold bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={isLoading || otpCode.join('').length !== 6}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Confirm OTP & Sign In'}
          </button>

          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
            <button
              type="button"
              onClick={() => setStep('EMAIL_ENTRY')}
              className="hover:text-white transition-colors"
            >
              ← Edit Email
            </button>
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => handleRequestOTP()}
              className="text-amber-400 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {countdown > 0 ? `Resend code (${countdown}s)` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Biometrics Prompt */}
      {step === 'BIOMETRICS_PROMPT' && (
        <div className="text-center py-2 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-3xl">
            {biometricType === 'FACE_ID' ? '👤' : '👆'}
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Enable {biometricType === 'FACE_ID' ? 'Face ID' : 'Fingerprint'}?</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Sign in instantly next time with biometric sensor authentication. Your institutional keys stay encrypted on your device.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => handleBiometricsDecision(true)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              Enable Biometrics (Recommended)
            </button>
            <button
              type="button"
              onClick={() => handleBiometricsDecision(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {onCancel && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Cancel and Return
          </button>
        </div>
      )}
    </div>
  );
};
