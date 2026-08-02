import { PackageOpen } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-gray-300">
        {icon || <PackageOpen className="h-16 w-16" />}
      </div>
      <h3 className="text-lg font-medium text-gray-600">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-400 max-w-sm">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
