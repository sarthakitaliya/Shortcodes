import React, { useState } from 'react';
import { Link } from 'lucide-react';

interface FaviconProps {
    url?: string;
    size?: number;
    className?: string;
}

export const Favicon: React.FC<FaviconProps> = ({ url, size = 18, className = '' }) => {
    const [error, setError] = useState(false);

    // Helper to extract hostname safely
    const getHostname = (urlStr: string) => {
        try {
            // Handle basic URLs without protocol
            const fullUrl = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
            return new URL(fullUrl).hostname;
        } catch (e) {
            return null;
        }
    };

    const hostname = url ? getHostname(url) : null;

    if (!url || !hostname || error) {
        return <Link size={size} className={`text-gray-500 ${className}`} />;
    }

    // Google Favicon Service URL (sz=32 fetches 32x32 icon for retina clarity at 16px)
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size * 2}`;

    return (
        <img
            src={faviconUrl}
            alt="site icon"
            width={size}
            height={size}
            className={`rounded-sm object-contain ${className}`}
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};
