export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.1c1.9 2.9 3.6 4.6 3.6 6.7a3.6 3.6 0 1 1-7.2 0c0-2.1 1.7-3.8 3.6-6.7Z" />
      <path d="M9 14.35c0-1.02 1.29-1.75 3-1.75s3 .73 3 1.75L12.86 21c-.16.62-1.06.66-1.28.06l-.02-.06L9 14.35Z" />
    </svg>
  );
}
