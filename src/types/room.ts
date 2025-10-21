// src/types/room.ts
import { Timestamp } from 'firebase/firestore';

export interface MealPlanItem {
    id?: string; // Adicionado para compatibilidade com useFieldArray
    name: string; // Ex: 'Café da Manhã'
    time: string; // Ex: '08:00'
    items: string; // Ex: '1 fatia de pão integral, 2 ovos mexidos'
}

export interface ActivePlan {
    meals: MealPlanItem[];
    hydrationGoal: number; // ml
    calorieGoal: number; // kcal
    createdAt: Timestamp;
}

export interface PatientInfo {
    name: string;
    email: string;
    age?: number;
    weight?: number;
}

export interface Room {
    id: string;
    tenantId: string; // The tenant this room belongs to
    roomName: string;
    professionalId: string;
    patientId: string;
    patientInfo: PatientInfo;
    activePlan: ActivePlan;
    planHistory: ActivePlan[];
    createdAt: Timestamp;
    lastMessage?: {
      text: string;
      senderId: string;
      createdAt: Timestamp;
    };
    lastRead?: {
        [userId: string]: Timestamp;
    };
}
