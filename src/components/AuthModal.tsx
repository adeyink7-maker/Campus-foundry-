import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  User, 
  Store, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  KeyRound, 
  RotateCw,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, StudentLevel } from '../types';
import { FacultyDepartmentSelector } from './FacultyDepartmentSelector';
import { HostelSelectMenu } from './HostelSelectMenu';
import { UNILORIN_DOMAIN, ADMIN_EMAILS } from '../services/unilorinAuth';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  initialStep?: 'input' | 'verify' | 'onboarding';
  forceOnboarding?: boolean;
  onSuccess?: () => void;
}

export const AuthModal = ({
  isOpen,
  onClose,
  defaultRole = 'student',
  initialStep,
  forceOnboarding = false,
  onSuccess,
}: AuthModalProps) => {
  const { currentUser, requestUnilorinOTP, verifyUnilorinOTP, updateUser } = useAuth();

  const [role, setRole] = useState<UserRole>(defaultRole);
  
  // UNILORIN OTP Flow Step: 'input' | 'verify' | 'onboarding'
  const [otpStep, setOtpStep] = useState<'input' | 'verify' | 'onboarding'>(() => {
    if (forceOnboarding || initialStep === 'onboarding') return 'onboarding';
    return initialStep || 'input';
  });
  const [otpCode, setOtpCode] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Form Fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState<StudentLevel>('300L');
  const [hostelLocation, setHostelLocation] = useState('Lagos Hostel (Male Wing)');
  const [faculty, setFaculty] = useState('Faculty of Communication and Information Sciences (CIS)');
  const [department, setDepartment] = useState('Computer Science');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
      if (forceOnboarding || initialStep === 'onboarding') {
        setOtpStep('onboarding');
        if (currentUser) {
          setEmail(currentUser.email || '');
          setFullName(currentUser.fullName === 'UNILORIN Student' ? '' : currentUser.fullName || '');
          if (currentUser.level) setLevel(currentUser.level as StudentLevel);
          if (currentUser.faculty) setFaculty(currentUser.faculty);
          if (currentUser.department) setDepartment(currentUser.department);
          if (currentUser.hostelLocation) setHostelLocation(currentUser.hostelLocation);
          if (currentUser.whatsapp) setWhatsapp(currentUser.whatsapp);
        }
      } else {
        setOtpStep(initialStep || 'input');
      }
      setOtpCode('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, defaultRole, initialStep, forceOnboarding, currentUser]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // Domain Suffix click
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

  // Step 1: Request OTP from Supabase
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your UNILORIN student email address.');
      return;
    }

    const domain = trimmedEmail.split('@')[1];
    if (domain !== UNILORIN_DOMAIN && !ADMIN_EMAILS.includes(trimmedEmail)) {
      setError(`Access Restricted: Email must end with @${UNILORIN_DOMAIN}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await requestUnilorinOTP(trimmedEmail);
      setOtpStep('verify');
      setCooldownSeconds(60);
      setSuccess(`Verification code sent to ${trimmedEmail}. Please check your webmail inbox or spam folder.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (otpCode.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const verifyResult = await verifyUnilorinOTP({
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
        role,
      });

      if (verifyResult.needsOnboarding) {
        setOtpStep('onboarding');
        setSuccess('Code verified! Please complete your student profile details before continuing.');
      } else {
        setSuccess(`Welcome back! UNILORIN student identity verified.`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 700);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expire')) {
        setError('Verification code has expired. Please request a new code.');
      } else if (msg.toLowerCase().includes('attempt') || msg.toLowerCase().includes('rate')) {
        setError('Too many verification attempts. Please wait a moment before trying again.');
      } else {
        setError('Incorrect verification code. Please check your webmail inbox or spam folder and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Complete First-Time Onboarding
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Save to profiles table using real column names
        await supabase.from('profiles').upsert({
          id: userId,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: role,
          account_type: role === 'trader' ? 'TRADER' : 'BUYER',
          level: level,
          faculty: faculty,
          department: department,
          hostel_location: hostelLocation,
          whatsapp: whatsapp.trim() || undefined,
          is_verified: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }

      await updateUser({
        fullName: fullName.trim(),
        level,
        faculty,
        department,
        hostelLocation,
        whatsapp: whatsapp.trim() || undefined,
        role,
        accountType: role === 'trader' ? 'TRADER' : 'BUYER',
      });

      setSuccess(`Profile set up successfully! Welcome, ${fullName.trim()}.`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to save student profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={forceOnboarding ? undefined : onClose}
    >
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                {otpStep === 'onboarding' ? 'Student Profile Onboarding' : 'Campus Foundry Student Login'}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">
              {otpStep === 'onboarding' 
                ? 'Complete your student identity before entering the feed'
                : 'Student @students.unilorin.edu.ng email OTP verification'}
            </p>
          </div>

          {!forceOnboarding && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
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

          {/* STEP 1: EMAIL ENTRY */}
          {otpStep === 'input' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  Must end with <code className="text-blue-300">@students.unilorin.edu.ng</code>
                </p>
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
          )}

          {/* STEP 2: VERIFY 6-DIGIT OTP */}
          {otpStep === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 text-center">
                <span className="text-xs text-blue-300 font-semibold block mb-0.5">
                  Verification Code Sent
                </span>
                <p className="text-xs text-neutral-300 font-mono">
                  {email}
                </p>
                <span className="text-[11px] text-neutral-400 block mt-1">
                  Check your student webmail inbox or <strong className="text-amber-300">spam folder</strong>. Code expires in 10 minutes.
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
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold font-mono rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-white placeholder-neutral-700 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-center text-[11px] text-neutral-400 mt-1">
                  Max 5 attempts allowed. If code expired, request a new one below.
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
                    <span>Verify Code & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: FIRST-TIME ONBOARDING BEFORE FEED */}
          {otpStep === 'onboarding' && (
            <form onSubmit={handleCompleteOnboarding} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Full Student Name *
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

              {/* Academic Level */}
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Academic Level *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['100L', '200L', '300L', '400L', '500L'] as StudentLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        level === lvl
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faculty & Department */}
              <FacultyDepartmentSelector
                selectedFaculty={faculty}
                onFacultyChange={setFaculty}
                selectedDepartment={department}
                onDepartmentChange={setDepartment}
                labelPrefix="Student"
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
                  WhatsApp Contact Number
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. 08039281744"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* Complete Onboarding */}
              <button
                type="submit"
                disabled={isSubmitting || !fullName.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete Profile & Enter Feed</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

