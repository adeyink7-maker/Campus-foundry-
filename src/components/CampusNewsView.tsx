import React from 'react';
import { Newspaper, Clock } from 'lucide-react';

interface CampusNewsViewProps {
  onShowToast?: (msg: string) => void;
}

export const CampusNewsView: React.FC<CampusNewsViewProps> = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 sm:p-12 text-center backdrop-blur-md space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Newspaper className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coming soon</span>
          </div>
          <h2 className="text-xl font-bold text-white">Campus News & Admin Bulletins</h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Official senate circulars, academic calendar updates, and verified campus reports will be published here directly from university desks.
          </p>
        </div>
      </div>
    </div>
  );
};
