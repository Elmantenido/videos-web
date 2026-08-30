"use client";

import { useState } from "react";

type Diagnostics = {
  viewport: string;
  screen: string;
  platform: string;
};

function collectDiagnostics(): Diagnostics {
  const dpr = window.devicePixelRatio || 1;
  return {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height} @ ${dpr}x`,
    platform: navigator.platform || navigator.userAgent,
  };
}

export default function ReportProblemButton({ videoId }: { videoId: number }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  function openModal() {
    setDiagnostics(collectDiagnostics());
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, message, contactEmail, diagnostics }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function closeModal() {
    setOpen(false);
    setStatus("idle");
    setMessage("");
    setContactEmail("");
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mt-6 inline-flex items-center gap-2 rounded border border-white/15 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-white/30 hover:bg-white/5"
      >
        Report a problem
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "sent" ? (
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Thanks for the report</h2>
                <p className="mt-2 text-sm text-gray-600">
                  We&apos;ll take a look. You can close this window now.
                </p>
                <button
                  onClick={closeModal}
                  className="mt-4 rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Report a problem</h2>

                <label className="text-sm font-medium text-gray-900">
                  What happened?
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Example: Player loads forever after preroll, video freezes at 01:42, audio plays but screen stays black."
                    className="mt-1 w-full rounded border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </label>

                <label className="text-sm font-medium text-gray-900">
                  Contact email <span className="font-normal text-gray-400">Optional</span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </label>

                {status === "error" && (
                  <p className="text-sm text-red-600">
                    Something went wrong. Please try again.
                  </p>
                )}

                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded border px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {status === "sending" ? "Sending..." : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
