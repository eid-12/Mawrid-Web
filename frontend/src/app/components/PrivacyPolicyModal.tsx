import { X } from 'lucide-react';

type PrivacyPolicyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Privacy Policy</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy policy"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 text-sm leading-7 text-slate-700 dark:text-slate-200 max-h-[70vh] overflow-y-auto">
          <p className="mb-4">
            Mawrid collects only the information required to operate equipment borrowing services, such as your name,
            email, role, college affiliation, and request activity.
          </p>
          <p className="mb-4">
            This data is used to verify users, route requests, track equipment handovers, and maintain accountability
            records for university assets. We do not use your data for unrelated commercial purposes.
          </p>
          <p className="mb-4">
            Access to personal and transaction data is restricted to authorized system roles. Logs and request records
            may be retained according to institutional policy, security requirements, and audit obligations.
          </p>
          <p className="mb-4">
            You may request profile updates through your account settings or relevant administration channels. Sensitive
            operations are protected by authentication and access control safeguards.
          </p>
          <p>
            This is a professional placeholder and will be replaced with the official university privacy notice before
            production release.
          </p>
        </div>
      </div>
    </div>
  );
}
