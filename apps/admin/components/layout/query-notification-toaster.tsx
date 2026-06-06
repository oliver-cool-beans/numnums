'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function QueryNotificationToaster() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const notice = searchParams.get('notice');
    const error = searchParams.get('error');

    if (!notice && !error) {
      lastToastKeyRef.current = null;
      return;
    }

    const toastKey = JSON.stringify({ notice, error, pathname });

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    lastToastKeyRef.current = toastKey;

    if (notice) {
      toast.success(notice);
    }

    if (error) {
      toast.error(error);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('notice');
    nextParams.delete('error');

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}