import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Store, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Phone,
  Sparkles,
  AlertCircle,
  KeyRound,
  Clock,
  RotateCw,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { UNILORIN_HOSTEL_GROUPS } from '../data/mockData';
import { FacultyDepartmentSelector } from './FacultyDepartmentSelector';
import { HostelSelectMenu } from './HostelSelectMenu';
import { UNILORIN_DOMAIN } from '../services/unilorinAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'unilorin-otp';
  defaultRole?: UserRole;
  onSuccess?: () => void;
}

export const AuthModal = ({
  isOpen,
  onClose,
  initialMode = 'unilorin-otp',
  defaultRole = 'student',
  onSuccess,
}: AuthModalProps) => {
  const { signInWithEmail, signUpWithEmail, requestUnilorinOTP, verifyUnilorinOTP, signInDemo } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'unilorin-otp'>(initialMode);
  const [role, setRole] = useState<UserRole>(defaultRole);
  
  // UNILORIN OTP Flow State
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  const [otpCode, setOtpCode] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hostelLocation, setHostelLocation] = useState('Lagos Hostel (Male Wing)');
  const [faculty, setFaculty] = useState('Faculty of Communication and Information Sciences (CIS)');
  const [department, setDepartment] = useState('Computer Science');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode and role if props change while opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(defaultRole);
      setOtpStep('input');
      setOtpCode('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialMode, defaultRole]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // Handle Quick UNILORIN Domain Suffix click
  const handleApplyDomainSuffix = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmail(`25-31qq023@${UNILORIN_DOMAIN}`);
      return;
    }
    if (!trimmed.includes('@')) {
      setEmail(`${trimmed}@${UNILORIN_DOMAIN}`);
    } else {
      const prefix = trimmed.split('@')[0];
      setEmail(`${prefix}@${UNILORIN_DOMAIN}`);
    }
  };

  // Step 1: Request OTP from backend Cloud Functions
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await requestUnilorinOTP(email);
      setOtpStep('verify');
      setCooldownSeconds(60);
      setSuccess(`Verification code dispatched to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch verification code. Please check email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Register Student
  const handleVerifyOtpAndAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await verifyUnilorinOTP({
        email,
        otp: otpCode,
        fullName: fullName || 'UNILORIN Student',
        role,
        hostelLocation,
        whatsapp,
        faculty,
        department,
      });

      setSuccess(`Welcome, ${authenticatedUser.fullName}! UNILORIN student identity verified.`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the 6-digit passcode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Legacy Sign-in / Standard Sign-up handler
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password, role);
        setSuccess('Successfully signed in! Welcome to Campus Foundry.');
      } else {
        await signUpWithEmail(email, password, fullName, role, hostelLocation, whatsapp, faculty, department);
        setSuccess('Account created successfully! Your campus profile is ready.');
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async (demoRole: UserRole) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInDemo(demoRole);
      setSuccess(`Signed in as ${demoRole === 'trader' ? 'Student Trader' : 'Student Buyer'}!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err: any) {
      setError('Could not load demo session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip with UNILORIN Blue and Green */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                {mode === 'unilorin-otp' 
                  ? 'UNILORIN Student Authentication' 
                  : (mode === 'signin' ? 'Sign In to Campus Foundry' : 'Create Student Account')}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">
              {mode === 'unilorin-otp'
                ? 'Secured with official @students.unilorin.edu.ng domain & OTP'
                : (mode === 'signin' 
                  ? 'Access hostel deliveries, saved stores & order receipts' 
                  : 'Join UNILORIN student buyers & verified hostel traders')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/50 p-1 shrink-0">
          <button
            type="button"
            onClick={() => { setMode('unilorin-otp'); setError(null); setOtpStep('input'); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'unilorin-otp'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>UNILORIN OTP</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Standard Sign Up
          </button>
        </div>

        {/* Form Body Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* Status Banners */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Role Selector */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-2">
              Select Your Role on Campus:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  role === 'student'
                    ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                  <ShoppingBag className={`h-3.5 w-3.5 ${role === 'student' ? 'text-emerald-400' : 'text-neutral-400'}`} />
                  <span>Student Buyer</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Hostel room orders, campus food & groceries.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('trader')}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  role === 'trader'
                    ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                  <Store className={`h-3.5 w-3.5 ${role === 'trader' ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <span>Student Trader</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Vendor storefront, portfolio & WhatsApp dispatch.
                </p>
              </button>
            </div>
          </div>

          {/* UNILORIN OTP FLOW */}
          {mode === 'unilorin-otp' ? (
            <div className="space-y-4">
              {otpStep === 'input' ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">
                      Full Student Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Adeyinka Johnson"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* UNILORIN Student Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        UNILORIN Student Email
                      </label>
                      <button
                        type="button"
                        onClick={handleApplyDomainSuffix}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                      >
                        + Add @{UNILORIN_DOMAIN}
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. 25-31qq023@students.unilorin.edu.ng"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Must match matriculation format: <code className="text-blue-300">matric@students.unilorin.edu.ng</code>
                    </p>
                  </div>

                  {/* Faculty & Department */}
                  <FacultyDepartmentSelector
                    selectedFaculty={faculty}
                    onFacultyChange={setFaculty}
                    selectedDepartment={department}
                    onDepartmentChange={setDepartment}
                    labelPrefix={role === 'trader' ? 'Trader' : 'Student'}
                    compact={true}
                    required={true}
                  />

                  {/* Hostel Room Location */}
                  <HostelSelectMenu
                    selectedHostel={hostelLocation}
                    onHostelChange={setHostelLocation}
                    label="Hostel Room / Campus Residence"
                    required={true}
                  />

                  {/* WhatsApp */}
                  <div>
                    <label className="text-xs font-medium text-neutral-400 block mb-1">
                      WhatsApp Contact
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="e.g. 08039281744"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Submit to Send OTP */}
                  <button
                    type="submit"
                    disabled={isSubmitting || cooldownSeconds > 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/40 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Send 6-Digit Verification Code</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter & Verify 6-digit OTP */
                <form onSubmit={handleVerifyOtpAndAuthenticate} className="space-y-4">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 text-center">
                    <span className="text-xs text-blue-300 font-semibold block mb-0.5">
                      Verification Code Sent
                    </span>
                    <p className="text-xs text-neutral-300 font-mono">
                      {email}
                    </p>
                    <span className="text-[11px] text-neutral-400 block mt-1">
                      Check your student webmail inbox or spam folder. Code expires in 10 minutes.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1 text-center">
                      Enter 6-Digit Verification Passcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        pattern="\d{6}"
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[0.5em] text-2xl font-bold font-mono rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-white placeholder-neutral-700 focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <p className="text-center text-[11px] text-neutral-400 mt-1">
                      Max 5 attempts allowed before invalidation.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep('input')}
                      className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      Change Email
                    </button>

                    <button
                      type="button"
                      disabled={cooldownSeconds > 0 || isSubmitting}
                      onClick={() => handleRequestOtp()}
                      className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-neutral-800 text-blue-400 hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>{cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : 'Resend Code'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || otpCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verify & Sign In as UNILORIN Student</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Standard Sign-In / Sign-Up Form */
            <form onSubmit={handleStandardSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Full Name / Business Brand
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === 'trader' ? 'e.g. Adeyinka (Lagos Bakes)' : 'e.g. Adeyinka Johnson'}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. adeyinka@students.unilorin.edu.ng"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-neutral-400 hover:text-emerald-400 cursor-pointer">
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-10 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-3 pt-1 border-t border-neutral-850">
                  <FacultyDepartmentSelector
                    selectedFaculty={faculty}
                    onFacultyChange={setFaculty}
                    selectedDepartment={department}
                    onDepartmentChange={setDepartment}
                    labelPrefix={role === 'trader' ? 'Trader' : 'Student'}
                    compact={true}
                    required={true}
                  />

                  <HostelSelectMenu
                    selectedHostel={hostelLocation}
                    onHostelChange={setHostelLocation}
                    label="UNILORIN Hostel / Residence"
                    required={true}
                  />

                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                      WhatsApp (Orders & Notifications)
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="e.g. 08039281744"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-md disabled:opacity-50 ${
                  role === 'trader'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 shadow-amber-950/40'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-950/40'
                }`}
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <span>
                      {mode === 'signin' 
                        ? (role === 'trader' ? 'Sign In as Student Trader' : 'Sign In as Student Buyer')
                        : 'Complete Registration'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Login Helpers */}
          <div className="pt-2 border-t border-neutral-800/80">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block text-center mb-2">
              Instant 1-Click Evaluation Profiles
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('student')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 py-2 px-2.5 text-xs text-neutral-300 transition-colors"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                <span>Demo Buyer</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('trader')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 py-2 px-2.5 text-xs text-neutral-300 transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-amber-400" />
                <span>Demo Trader</span>
              </button>
            </div>
          </div>

          {/* Security & Verification Guarantee */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1 text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>UNILORIN Institutional Security &bull; Powered by Google Cloud & Firebase</span>
          </div>

        </div>
      </div>
    </div>
  );
};
