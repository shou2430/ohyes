import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowLeft, ImagePlus, Image, Eye, EyeOff, RefreshCw } from "lucide-react";
import SuccessModal from "../components/SuccessModal";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function CreateInvitationPage() {
  const { t } = useTranslation();

  // Form state
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true); // visible by default per D-16
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Success modal state
  const [successShareUrl, setSuccessShareUrl] = useState(null);

  const fileInputRef = useRef(null);

  // Revoke object URL on cleanup or change
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = t("create.titleRequired");
    if (!photoFile) newErrors.photo = t("create.photoRequired");
    if (password.length < 4 || password.length > 8)
      newErrors.password = t("create.passwordError");
    return newErrors;
  };

  const isFormValid = () => {
    return (
      title.trim().length > 0 &&
      photoFile !== null &&
      password.length >= 4 &&
      password.length <= 8
    );
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file size check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: t("create.photoTooLarge") }));
      return;
    }

    // Revoke old preview URL
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);

    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAreaKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched({ title: true, photo: true, password: true });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("ohyes_token");
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("password", password);
      formData.append("photo", photoFile);

      const res = await fetch(`${API_URL}/api/invitations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessShareUrl(data.share_url);
      } else {
        setToast(t("errors.network"));
      }
    } catch {
      setToast(t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  const passwordCharClass =
    touched.password && (password.length < 4 || password.length > 8)
      ? "text-destructive"
      : "text-text-secondary";

  return (
    <div className="min-h-screen bg-cream">
      {/* Back navigation */}
      <div className="px-4 pt-4 sm:px-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
          {t("create.back")}
        </Link>
      </div>

      {/* Content: two columns on lg, single on mobile */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 lg:flex lg:gap-8">
        {/* Form card */}
        <div className="w-full max-w-lg">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-white p-6 sm:p-8"
          >
            {/* Title field */}
            <div>
              <label
                htmlFor="invitation-title"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {t("create.titleLabel")}
              </label>
              <input
                id="invitation-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title && e.target.value.trim()) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.title;
                      return next;
                    });
                  }
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                placeholder={t("create.titlePlaceholder")}
                className={`h-11 w-full rounded-lg border px-3 text-base text-text-primary outline-none transition-colors placeholder:text-text-secondary ${
                  errors.title && touched.title
                    ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                    : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                }`}
              />
              {errors.title && touched.title && (
                <p className="mt-1 text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Photo upload */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-text-primary">
                {t("create.photoLabel")}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {photoPreviewUrl ? (
                <div
                  className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-lg"
                  onClick={handleUploadAreaClick}
                  onKeyDown={handleUploadAreaKeyDown}
                  tabIndex={0}
                  role="button"
                  aria-label={t("create.changePhoto")}
                >
                  <img
                    src={photoPreviewUrl}
                    alt="Upload preview"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/40 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <RefreshCw size={16} />
                    {t("create.changePhoto")}
                  </div>
                </div>
              ) : (
                <div
                  className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-accent hover:bg-cream/50"
                  onClick={handleUploadAreaClick}
                  onKeyDown={handleUploadAreaKeyDown}
                  tabIndex={0}
                  role="button"
                  aria-label={t("create.photoPlaceholder")}
                >
                  <ImagePlus size={32} className="text-text-secondary" />
                  <span className="mt-2 text-sm text-text-secondary">
                    {t("create.photoPlaceholder")}
                  </span>
                  <span className="mt-1 text-sm text-text-secondary">
                    {t("create.photoHint")}
                  </span>
                </div>
              )}
              {errors.photo && touched.photo && (
                <p className="mt-1 text-sm text-destructive">{errors.photo}</p>
              )}
            </div>

            {/* Password field */}
            <div className="mt-6">
              <label
                htmlFor="invitation-password"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                {t("create.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  id="invitation-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouched((prev) => ({ ...prev, password: true }));
                    if (
                      errors.password &&
                      e.target.value.length >= 4 &&
                      e.target.value.length <= 8
                    ) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, password: true }))
                  }
                  placeholder={t("create.passwordPlaceholder")}
                  className={`h-11 w-full rounded-lg border px-3 pr-10 text-base text-text-primary outline-none transition-colors placeholder:text-text-secondary ${
                    errors.password && touched.password
                      ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                      : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t("create.passwordHint")}
                </span>
                <span className={`text-sm ${passwordCharClass}`}>
                  {password.length}/8
                </span>
              </div>
              {errors.password && touched.password && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !isFormValid()}
              className={`mt-6 h-11 w-full rounded-lg bg-accent text-sm font-medium text-white transition-transform ${
                submitting || !isFormValid()
                  ? "cursor-not-allowed opacity-50"
                  : "hover:scale-[1.02]"
              }`}
            >
              {submitting ? t("create.submitting") : t("create.submit")}
            </button>
          </form>
        </div>

        {/* Preview panel */}
        <div className="mt-6 w-full max-w-sm lg:sticky lg:top-8 lg:mt-0 lg:self-start">
          <div className="rounded-lg border border-border bg-white p-4 sm:p-6">
            <h3 className="mb-3 text-sm font-medium text-text-secondary">
              {t("create.preview")}
            </h3>

            {/* Preview title */}
            <p
              className={`text-xl font-semibold ${
                title.trim()
                  ? "text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              {title.trim() || t("create.previewTitlePlaceholder")}
            </p>

            {/* Preview photo */}
            {photoPreviewUrl ? (
              <img
                src={photoPreviewUrl}
                alt="Preview"
                className="mt-3 aspect-[4/3] w-full rounded-lg object-cover"
              />
            ) : (
              <div className="mt-3 flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-stone-100">
                <Image size={48} className="text-stone-300" />
              </div>
            )}

            {/* Static Yes/No button mockups */}
            <div className="mt-4 flex gap-3">
              <div className="flex h-9 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-medium text-white">
                Yes
              </div>
              <div className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-text-primary">
                No
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast} type="error" onDismiss={() => setToast(null)} />
      )}

      {/* Success Modal */}
      {successShareUrl && (
        <SuccessModal
          shareUrl={successShareUrl}
          onClose={() => setSuccessShareUrl(null)}
        />
      )}
    </div>
  );
}
