import { X } from 'lucide-react';

type TermsOfServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Terms of Service</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terms of service"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 text-sm leading-7 text-slate-700 dark:text-slate-200 max-h-[70vh] overflow-y-auto">
          <p className="mb-4">
            Welcome to Mawrid. By creating an account and using the platform, you agree to use university
            equipment responsibly and only for approved academic activities.
          </p>
          <p className="mb-4">
            You are responsible for the accuracy of your account details, the confidentiality of your login
            credentials, and all requests made through your profile. Any misuse, false information, or policy
            violations may result in request rejection, account restrictions, or disciplinary action according to
            university regulations.
          </p>
          <p className="mb-4">
            Equipment borrowing is subject to availability, college policies, return deadlines, and condition checks.
            Late returns, damaged items, or unauthorized transfers may be logged and escalated to relevant college
            administration.
          </p>
          <p className="mb-4">
            Mawrid reserves the right to update operational policies, improve workflows, and apply technical controls
            that protect assets and user safety. Continued use of the system indicates acceptance of any updated
            terms.
          </p>
          <p>
            For detailed legal text, this placeholder will be replaced by the final approved policy before production
            release.
          </p>
        </div>
      </div>
    </div>
  );
}
