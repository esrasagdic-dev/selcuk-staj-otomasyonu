import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Props {
  src: string;
  alt: string;
  className?: string;
  cacheKey?: string;
}

/**
 * JWT yetkilendirme başlığıyla korunan backend görsel endpointlerinden
 * (örn. defter günü teknik görseli) blob alıp tarayıcıda görüntüler.
 */
export const AuthImage: React.FC<Props> = ({ src, alt, className, cacheKey }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    setFailed(false);
    setBlobUrl(null);

    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        currentUrl = URL.createObjectURL(res.data);
        setBlobUrl(currentUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src, cacheKey]);

  if (failed) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
        Görsel yüklenemedi.
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-400">
        Görsel yükleniyor...
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className ?? 'max-h-64 w-auto rounded-lg object-contain'} />;
};
