"use client";

import CenteredModal from "@/components/molecules/CenteredModal";

/** Success feedback auto-closes; errors stay until dismissed. */
export const SUCCESS_FEEDBACK_AUTO_CLOSE_MS = 2000;

export default function ActionFeedbackModal({
  isOpen,
  onClose,
  title,
  message,
  success = false,
  autoCloseMs = SUCCESS_FEEDBACK_AUTO_CLOSE_MS,
}) {
  return (
    <CenteredModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      autoDismissMs={success ? autoCloseMs : null}
      autoDismissProgressColor={success ? "var(--ok)" : undefined}
      autoDismissEdge="bottom"
    >
      <div
        style={{
          color: success ? "var(--ok)" : "var(--danger)",
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        {message}
      </div>
    </CenteredModal>
  );
}
