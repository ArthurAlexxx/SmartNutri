// src/types/meal.ts
export interface Food {
  nome: string;
  porcao: number;
  unidade: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
}

export interface Totals {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
}

export interface MealData {
  alimentos: Food[];
  totais: Totals;
}

export interface MealEntry {
  id: string; // Changed to string for Firestore document ID
  userId: string;
  date: string;
  mealType: string;
  mealData: MealData;
  createdAt: any; // Can be Timestamp
}
