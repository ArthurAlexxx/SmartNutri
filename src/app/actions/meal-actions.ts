
'use server';

import { getLocalDateString } from '@/lib/date-utils';
import { Timestamp } from 'firebase/firestore'; // Note: This is from the CLIENT SDK

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    return { error: 'Usuário não autenticado.' };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { error: 'A URL do webhook de nutrição não está configurada.' };
  }

  const combinedFoodString = data.foods
    .map(food => `${food.portion}${food.unit} de ${food.name}`)
    .join(' e ');

  try {
    const payload = {
      action: 'ref',
      alimento: combinedFoodString,
      userId: userId,
      mealType: data.mealType,
      date: getLocalDateString(),
      foods: data.foods,
      createdAt: new Date().toISOString(), // Send as ISO string
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        throw new Error(`O serviço de nutrição retornou um erro: ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // The webhook now returns the created document directly
    if (responseData && responseData.id) {
        // Convert server timestamp fields back to client-side Timestamp objects
        const finalMealEntry = {
            ...responseData,
            createdAt: Timestamp.fromDate(new Date(responseData.createdAt)),
        };
        return { mealEntry: finalMealEntry };
    } else {
        throw new Error('Formato de resposta do webhook inesperado.');
    }

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}

    