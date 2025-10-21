// src/types/tenant.ts
import { Timestamp } from 'firebase/firestore';

export interface Tenant {
    id: string;
    name: string;
    ownerId: string;
    professionalIds?: string[];
    createdAt: Timestamp;

    // Billing Info
    subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Timestamp;
}
