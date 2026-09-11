"use client";

import { FormEvent, useEffect, useState } from "react";

type HomepageContactModalProps = {
  open: boolean;
  onClose: () => void;
};

export function HomepageContactModal({
  open,
  onClose,
}: HomepageContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "sending") return;

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          payload?.error || "Your message could not be sent.",
        );
      }

      setStatus("sent");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setWebsite("");
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Your message could not be sent.",
      );
    }
  }

  return (
    <div
      data-public-skin-surface="true"
      className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-6 components_homepage_homepage_contact_modal_div_dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homepage-contact-title"
    >
      <button
        type="button"
        aria-label="Close Contact"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(var(--sep-colour-050403))]/88 backdrop-blur-[3px] components_homepage_homepage_contact_modal_button_close_contact"
      />

      <section className="relative z-10 w-full max-w-[680px] overflow-hidden border border-[rgb(var(--sep-colour-795a34))]/70 bg-[rgb(var(--sep-colour-0d0907))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.9)] components_homepage_homepage_contact_modal_section_section">
        <header className="relative border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-120d0a))] px-5 py-4 sm:px-6 components_homepage_homepage_contact_modal_header_contact">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Contact"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-lg text-[rgb(var(--sep-colour-bda57f))] transition hover:border-[rgb(var(--sep-colour-9b7443))] hover:text-[rgb(var(--sep-colour-f1d7a5))] components_homepage_homepage_contact_modal_button_close_contact_2"
          >
            ×
          </button>

          <p className="text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-80684c))] components_homepage_homepage_contact_modal_p_contact">
            Sepulchria
          </p>

          <h2
            id="homepage-contact-title"
            className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e0c99e))] components_homepage_homepage_contact_modal_h2_homepage_contact_title"
          >
            Contact
          </h2>

          <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-9f907b))] components_homepage_homepage_contact_modal_p_contact_2">
            Send a message to the Sepulchria team.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 px-5 py-5 sm:px-6 sm:py-6 components_homepage_homepage_contact_modal_form_submit"
        >
          <div className="grid gap-4 sm:grid-cols-2 components_homepage_homepage_contact_modal_div_container">
            <label className="block components_homepage_homepage_contact_modal_label_label">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))] components_homepage_homepage_contact_modal_span_text">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                autoComplete="name"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))] components_homepage_homepage_contact_modal_input_field"
              />
            </label>

            <label className="block components_homepage_homepage_contact_modal_label_label_2">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))] components_homepage_homepage_contact_modal_span_text_2">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
                autoComplete="email"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))] components_homepage_homepage_contact_modal_input_field_2"
              />
            </label>
          </div>

          <label className="block components_homepage_homepage_contact_modal_label_label_3">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))] components_homepage_homepage_contact_modal_span_text_3">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              required
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))] components_homepage_homepage_contact_modal_input_field_3"
            />
          </label>

          <label className="block components_homepage_homepage_contact_modal_label_label_4">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))] components_homepage_homepage_contact_modal_span_text_4">
              Message
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={5000}
              required
              rows={8}
              className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))] components_homepage_homepage_contact_modal_textarea_field"
            />
          </label>

          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden components_homepage_homepage_contact_modal_div_website"
          >
            <label className="components_homepage_homepage_contact_modal_label_website">
              Website
              <input className="components_homepage_homepage_contact_modal_input_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {status === "sent" ? (
            <div
              role="status"
              className="border border-emerald-700/60 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200 components_homepage_homepage_contact_modal_div_status"
            >
              Your message has been sent successfully.
            </div>
          ) : null}

          {status === "error" ? (
            <div
              role="alert"
              className="border border-red-800/60 bg-red-950/35 px-4 py-3 text-sm text-red-200 components_homepage_homepage_contact_modal_div_alert"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-4 sm:flex-row sm:items-center sm:justify-between components_homepage_homepage_contact_modal_div_container_2">
            <p className="text-[10px] text-[rgb(var(--sep-colour-817566))] components_homepage_homepage_contact_modal_p_text">
              Messages are delivered to info@sepulchria.com.
            </p>

            <button
              type="submit"
              disabled={status === "sending"}
              className="border border-[rgb(var(--sep-colour-a77a42))]/75 bg-[rgb(var(--sep-colour-382313))] px-5 py-2.5 font-serif text-sm text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] disabled:cursor-wait disabled:opacity-60 components_homepage_homepage_contact_modal_button_action"
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
