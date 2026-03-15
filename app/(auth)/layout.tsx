export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          📡 Pulsebot
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Real-time monitoring, simplified
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
