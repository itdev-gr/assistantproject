import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@aga/db/server';

export async function getServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const c of toSet) {
        cookieStore.set(c.name, c.value, c.options);
      }
    },
  });
}
