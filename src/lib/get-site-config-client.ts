
// src/lib/get-site-config-client.ts
import 'client-only';
import { doc, getDoc, onSnapshot, Unsubscribe, Firestore } from 'firebase/firestore';
import { defaultSiteConfig } from '@/lib/default-site-config';
import { siteConfigSchema, type SiteConfig } from '@/lib/site-config-schema';

/**
 * Fetches the site configuration from Firestore for a specific tenant on the client-side,
 * falling back to defaults and providing real-time updates.
 * It merges tenant-specific customizations with the hardcoded default configuration.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant whose config is to be fetched. Can be null.
 * @param callback - A function to be called with the new config whenever it changes.
 * @returns An unsubscribe function to clean up the listener.
 */
export const getSiteConfig = (
  firestore: Firestore,
  tenantId: string | null,
  callback: (config: SiteConfig) => void
): Unsubscribe => {
  
  const effectiveTenantId = tenantId || 'default';

  // Path to the tenant-specific configuration
  const configRef = doc(firestore, `tenants/${effectiveTenantId}/config`, 'site');

  const unsubscribe = onSnapshot(configRef, (doc) => {
    // Start with the hardcoded default config as the base
    const baseConfig = { ...defaultSiteConfig };
    
    let tenantConfig: Partial<SiteConfig> = {};
    if (doc.exists()) {
      tenantConfig = doc.data();
    }
    
    // Deep merge the tenant's specific customizations over the base defaults.
    // This ensures that any fields not set by the tenant still have a fallback value.
    const combinedConfig = {
        ...baseConfig,
        ...tenantConfig,
        logo: { ...baseConfig.logo, ...tenantConfig.logo },
        theme: { ...baseConfig.theme, ...tenantConfig.theme },
        heroSection: { ...baseConfig.heroSection, ...tenantConfig.heroSection },
        featuresSection: { ...baseConfig.featuresSection, ...tenantConfig.featuresSection },
        professionalProfileSection: { ...baseConfig.professionalProfileSection, ...tenantConfig.professionalProfileSection },
        ctaSection: { ...baseConfig.ctaSection, ...tenantConfig.ctaSection },
        testimonialsSection: { ...baseConfig.testimonialsSection, ...tenantConfig.testimonialsSection },
        finalCtaSection: { ...baseConfig.finalCtaSection, ...tenantConfig.finalCtaSection },
    };

    const parsed = siteConfigSchema.safeParse(combinedConfig);
    if (parsed.success) {
      callback(parsed.data);
    } else {
      console.error(`Invalid data in merged config for tenant '${effectiveTenantId}'. Using defaults.`, parsed.error);
      callback(defaultSiteConfig);
    }
  }, (error) => {
    console.error(`Error fetching site config for tenant ${effectiveTenantId}:`, error);
    // On error, fallback to the hardcoded default config
    callback(defaultSiteConfig);
  });

  return unsubscribe;
};
