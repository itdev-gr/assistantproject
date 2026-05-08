import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GuestChat } from '@/components/guest/GuestChat';

interface Props {
  params: Promise<{ locale: string; hotelSlug: string }>;
  searchParams: Promise<{ room?: string }>;
}

export default async function GuestHotelPage({ params, searchParams }: Props) {
  const { locale, hotelSlug } = await params;
  const { room } = await searchParams;
  setRequestLocale(locale);

  // TODO(week-3): resolve hotelSlug → hotel public profile via Supabase view.
  if (!hotelSlug) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-background">
      <header className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">{hotelSlug}</h1>
        {room && <p className="text-xs text-muted-foreground">Room {room}</p>}
      </header>
      <GuestChat hotelSlug={hotelSlug} />
    </main>
  );
}
