import { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  XCircle, 
  Eye, 
  RotateCw, 
  User, 
  GraduationCap, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VerificationRequest } from '../types';
import { 
  fetchPendingVerificationRequests, 
  approveVerificationRequest, 
  rejectVerificationRequest,
  getProofSignedUrl
} from '../services/verificationService';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestActioned?: () => void;
}

export const AdminVerificationModal = ({
  isOpen,
  onClose,
  onRequestActioned,
}: AdminVerificationModalProps) => {
  const { currentUser, syncUserProfileFromSupabase } = useAuth();

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lightbox view state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewApplicantName, setPreviewApplicantName] = useState<string>('');

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPendingVerificationRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load verification requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Lightbox preview of proof image
  const handleViewProof = async (req: VerificationRequest) => {
    try {
      const signedUrl = await getProofSignedUrl(req.proofUrl);
      setPreviewImageUrl(signedUrl);
      setPreviewApplicantName(req.applicantName || 'Applicant');
    } catch (e) {
      console.warn('[View proof signed URL error]:', e);
      setPreviewImageUrl(req.proofUrl);
    }
  };

  // Handle Approve
  const handleApprove = async (req: VerificationRequest) => {
    if (!currentUser) return;
    setActioningId(req.id);
    try {
      await approveVerificationRequest(req.id, req.userId, currentUser.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (req.userId === currentUser.id) {
        await syncUserProfileFromSupabase(currentUser.id);
      }
      onRequestActioned?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request.');
    } finally {
      setActioningId(null);
    }
  };

  // Handle Reject
  const handleReject = async (req: VerificationRequest) => {
    if (!currentUser) return;
    setActioningId(req.id);
    try {
      await rejectVerificationRequest(req.id, req.userId, currentUser.id, 'Document could not be verified.');
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      onRequestActioned?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject request.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Admin Accent Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Student Verification Requests
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    Admin Only
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {requests.length} pending student applicant{requests.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadRequests}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Refresh Requests"
              >
                <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
            
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="py-12 text-center text-neutral-400 space-y-3">
                <RotateCw className="h-8 w-8 animate-spin mx-auto text-amber-400" />
                <p className="text-xs font-semibold">Loading verification requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-400">
                  <Check className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white">All caught up!</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  There are currently no pending student verification requests in the queue.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      
                      {/* Applicant Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {req.applicantName}
                          </h4>
                          {req.applicantLevel && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] font-mono font-bold">
                              {req.applicantLevel}
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {req.applicantEmail && (
                          <p className="text-xs font-mono text-neutral-400">
                            {req.applicantEmail}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-neutral-300 pt-0.5">
                          <GraduationCap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>
                            {req.applicantDepartment || 'Department'} • {req.applicantFaculty || 'Faculty'}
                          </span>
                        </div>

                        {req.note && (
                          <p className="text-xs text-neutral-300 bg-neutral-900/90 border border-neutral-800 rounded-lg p-2 mt-2 italic">
                            "{req.note}"
                          </p>
                        )}
                      </div>

                      {/* Tap to View Proof Button */}
                      <button
                        type="button"
                        onClick={() => handleViewProof(req)}
                        className="self-start px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Proof</span>
                      </button>
                    </div>

                    {/* Action Buttons: Approve & Reject */}
                    <div className="pt-2 border-t border-neutral-900 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(req)}
                        disabled={actioningId === req.id}
                        className="px-3 py-1.5 rounded-xl border border-neutral-700 hover:border-rose-500/50 hover:bg-rose-500/10 text-neutral-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={actioningId === req.id}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {actioningId === req.id ? (
                          <>
                            <RotateCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve Student</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Lightbox Modal for Full Image View */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Proof Document • {previewApplicantName}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto rounded-xl flex items-center justify-center bg-black/50">
              <img 
                src={previewImageUrl} 
                alt="Student Proof Document" 
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
