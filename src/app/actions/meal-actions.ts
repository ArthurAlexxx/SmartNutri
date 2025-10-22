
// src/app/actions/meal-actions.ts
'use server';

import { getLocalDateString } from '@/lib/date-utils';
import { v4 as uuidv4 } from 'uuid';

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

  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
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
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
    }

    const responseData = await response.json();

    // Extrai o JSON aninhado da resposta do webhook
    const nestedOutput = JSON.parse(responseData[0].output);
    const nutritionData = nestedOutput.resultado;

    if (!nutritionData) {
      throw new Error('Formato de resposta de nutrição inesperado do webhook.');
    }

    // Cria o objeto mealEntry completo para retornar ao cliente.
    // O n8n ainda será responsável por salvar isso no Firestore.
    const mealEntry = {
      id: uuidv4(),
      userId: userId,
      date: getLocalDateString(),
      mealType: data.mealType,
      createdAt: new Date().toISOString(),
      mealData: {
        alimentos: data.foods.map(f => ({ ...f, calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })),
        totais: {
          calorias: nutritionData.calorias_kcal || 0,
          proteinas: nutritionData.proteinas_g || 0,
          carboidratos: nutritionData.carboidratos_g || 0,
          gorduras: nutritionData.gorduras_g || 0,
          fibras: nutritionData.fibras_g || 0,
        },
      },
    };
    
    // Opcional: Enviar o objeto formatado de volta para o n8n para salvamento, se necessário.
    // Isso depende da lógica do seu webhook. Por agora, apenas retornamos para a UI.

    return { mealEntry };

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
