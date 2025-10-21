// src/types/library.ts

interface MealItem {
    name: string;
    time: string;
    items: string;
}

export interface PlanTemplate {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    calorieGoal: number;
    hydrationGoal: number;
    meals: MealItem[];
}

export interface Guideline {
    id: string;
    tenantId: string;
    title: string;
    content: string;
}
