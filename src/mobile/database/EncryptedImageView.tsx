import React, { useEffect, useState } from 'react';
import { InMemoryImageDecryptor } from './InMemoryImageDecryptor';

export interface EncryptedImageProps {
  encryptedFilePath: string;
  mediaKey: string;
  macKey: string;
  iv: string;
  macTag: string;
  alt?: string;
  className?: string;
}

export const EncryptedImageView: React.FC<EncryptedImageProps> = ({
  encryptedFilePath,
  mediaKey,
  macKey,
  iv,
  macTag,
  alt = 'Decrypted media',
  className = 'w-full h-full object-cover',
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const decryptAndLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        const uri = await InMemoryImageDecryptor.decryptImageToDataUri(
          encryptedFilePath,
          mediaKey,
          macKey,
          iv,
          macTag
        );

        if (isMounted) {
          setImageUri(uri);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to decrypt image in memory:', err);
        if (isMounted) {
          setError(err?.message || 'Decryption failed');
          setLoading(false);
        }
      }
    };

    decryptAndLoad();

    return () => {
      isMounted = false;
      // Wipe state reference when unmounting to free memory
      setImageUri(null);
    };
  }, [encryptedFilePath, mediaKey, macKey, iv, macTag]);

  if (loading) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-white/70">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-mono text-neutral-400">Decrypting in RAM...</span>
      </div>
    );
  }

  if (error || !imageUri) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-neutral-900 p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
          ⚠️
        </div>
        <p className="text-xs text-red-400 font-medium">Integrity Check Failed</p>
        <p className="text-[10px] text-neutral-500 mt-1">HMAC or Media Key mismatch</p>
      </div>
    );
  }

  return (
    <img
      src={imageUri}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
};

export default EncryptedImageView;
