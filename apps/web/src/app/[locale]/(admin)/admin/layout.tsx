import { setRequestLocale } from 'next-intl/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // TODO(week-3): require super-admin via Supabase. 403 otherwise.
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
