// src/types/user.ts
import { Timestamp } from "firebase/firestore";

// This defines the structure of a single meal in the plan.
export interface MealPlanItem {
    id?: string; 
    name: string; // Ex: 'Café da Manhã'
    time: string; // Ex: '08:00'
    items: string; // Ex: '1 fatia de pão integral, 2 ovos mexidos'
}

// This defines the structure of the active meal plan.
export interface ActivePlan {
    meals: MealPlanItem[];
    hydrationGoal: number; // ml
    calorieGoal: number; // kcal
    proteinGoal: number; // g
    createdAt: Timestamp;
}

export interface Subscription {
    id: string;
    userId: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: Timestamp;
}

export interface ProfessionalDetails {
    specialty?: string;
}

export interface UserProfile {
    id: string;
    tenantId: string; // The tenant this user belongs to
    fullName: string;
    email: string;
    profileType: 'patient' | 'professional';
    role?: 'super-admin' | 'admin' | 'professional'; // 'super-admin' for platform owner, 'admin' for tenant owner, 'professional' for others
    createdAt: Timestamp;
    
    // Subscription details for independent patients
    subscriptionStatus?: 'trial' | 'active' | 'inactive';
    trialEndsAt?: Timestamp;

    // Professional fields
    professionalDetails?: ProfessionalDetails;
    professionalRoomIds?: string[];
    
    // Patient fields
    age?: number;
    weight?: number;
    targetWeight?: number; // Meta de peso
    targetDate?: Timestamp; // Data para atingir a meta
    whatsappPhoneNumber?: string; // Número para integração com WhatsApp
    patientRoomId?: string | null;
    dashboardShareCode?: string;
    calorieGoal?: number;
    proteinGoal?: number;
    waterGoal?: number; // Meta diária de água em ml
    activePlan?: ActivePlan;
}
