import Link from 'next/link';

export function ForbiddenPage({
  role,
  requiredRole = 'owner',
}: {
  role: string;
  requiredRole?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-600 text-3xl font-bold">
        403
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-2">
        Access Forbidden
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Your account role (<span className="font-semibold text-foreground uppercase">{role}</span>) does not have
        permission to view this administrative section. Only users with the{' '}
        <span className="font-semibold text-foreground uppercase">{requiredRole}</span> role can access this page.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
