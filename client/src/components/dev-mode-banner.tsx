import React from 'react';

export function DevModeBanner() {
    if (!import.meta.env.DEV) return null;

    return (
        <div className="bg-amber-500 text-white text-center py-1 text-xs font-medium sticky top-0 z-[100] shadow-sm flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>Dev Mode: Authenticated as <strong>devUser</strong> (Auth Bypass Active)</span>
        </div>
    );
}
