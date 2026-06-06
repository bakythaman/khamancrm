'use client';

import { useEffect, useState } from 'react';
import { isStoredMediaUrl, loadStoredMediaUrl } from '@/lib/storage/media-store';

export function useResolvedMediaUrl(url: string) {
  const [src, setSrc] = useState(url);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!url || !isStoredMediaUrl(url)) {
      setSrc(url);
      return undefined;
    }

    setSrc('');
    void loadStoredMediaUrl(url).then((resolved) => {
      if (!active) {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
        return;
      }
      objectUrl = resolved.startsWith('blob:') ? resolved : '';
      setSrc(resolved);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return src;
}
