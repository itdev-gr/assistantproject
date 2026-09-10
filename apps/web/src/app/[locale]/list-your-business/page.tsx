import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Legacy URL. Businesses join through a partner account with a paid plan
 * (see /pricing); keep the old link working for anything that still points here.
 */
export default async function ListYourBusinessPage({ params }: Props) {
  const { locale } = await params;
  redirect(`${locale === 'en' ? '/en' : ''}/signup?role=partner`);
}
