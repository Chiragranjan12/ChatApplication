// Protected Route Component
// Redirects to /auth if user is not authenticated

import React from 'react';
import { useLocation } from 'wouter';
import { tokenManager } from '@/lib/api';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [, setLocation] = useLocation();

    React.useEffect(() => {
        // Redirect if not authenticated AND NOT in dev mode
        if (!tokenManager.isAuthenticated() && !import.meta.env.DEV) {
            setLocation('/auth');
        }
    }, [setLocation]);

    // Don't render if not authenticated AND NOT in dev mode
    if (!tokenManager.isAuthenticated() && !import.meta.env.DEV) {
        return null;
    }

    return <>{children}</>;
}
