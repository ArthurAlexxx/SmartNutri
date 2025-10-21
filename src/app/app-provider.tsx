
// src/app/app-provider.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useFirestore, useUser } from '@/firebase';
import { getSiteConfig } from '@/lib/get-site-config-client';
import { type SiteConfig, colorHslMap, colorForegroundHslMap } from '@/lib/site-config-schema';
import { SiteConfigContext } from '@/context/site-config-context';

function StyleInjector({ config }: { config: SiteConfig }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.title = config.siteName;

    const primaryColorName = config.theme.primaryColor as keyof typeof colorHslMap;
    const primaryColorHsl = colorHslMap[primaryColorName] || colorHslMap['Verde Nutri'];
    const primaryForegroundHsl = colorForegroundHslMap[primaryColorName] || colorForegroundHslMap['Verde Nutri'];

    const styleTagId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleTagId) as HTMLStyleElement | null;
    
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleTagId;
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      :root {
        --primary: ${primaryColorHsl};
        --primary-foreground: ${primaryForegroundHsl};
        --ring: ${primaryColorHsl};
      }
    `;

  }, [config.theme.primaryColor, config.siteName]);

  return null;
}

function ConfigAndStyleLoader({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const firestore = useFirestore();
    const { userProfile, isUserLoading } = useUser();
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        if (isUserLoading) return;

        // If the user is logged in, their site config is determined by their tenant.
        if (userProfile) {
            setTenantId(userProfile.tenantId);
            return;
        }

        // For anonymous visitors, determine the tenant from the subdomain.
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            
            // Check for a valid subdomain, excluding 'www', and common development/platform environments.
            const isSubdomain = parts.length > 2 && parts[0] !== 'www';
            const isPlatformDomain = hostname.includes('localhost') || hostname.endsWith('vercel.app') || hostname.endsWith('.dev') || hostname.endsWith('cloudworkstations.dev');

            if (isSubdomain && !isPlatformDomain) {
                setTenantId(parts[0]);
                return;
            }
        }
        
        // Fallback to the default site config if no specific tenant is found.
        setTenantId('default');

    }, [userProfile, isUserLoading]);


    useEffect(() => {
      if (!firestore || !tenantId) return;
      
      setConfig(null); // Reset on tenant change to show loading state
      const unsub = getSiteConfig(firestore, tenantId, (newConfig) => {
        setConfig(newConfig);
      });

      return () => unsub();
    }, [firestore, tenantId]);

    return (
        <SiteConfigContext.Provider value={config}>
            {config ? <StyleInjector config={config} /> : null}
            {children}
        </SiteConfigContext.Provider>
    );
}

export default function AppProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <FirebaseClientProvider>
            <ConfigAndStyleLoader>
                {children}
            </ConfigAndStyleLoader>
        </FirebaseClientProvider>
    );
}
