// src/context/site-config-context.ts
import { createContext } from 'react';
import type { SiteConfig } from '@/lib/site-config-schema';

export const SiteConfigContext = createContext<SiteConfig | null>(null);
