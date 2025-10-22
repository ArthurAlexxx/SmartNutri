// src/app/actions/meal-actions.ts
'use server';

import { getLocalDateString } from '@/lib/date-utils';

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

// Esta ação agora apenas envia os dados para o n8n.
// O n8n será responsável por calcular os nutrientes E salvar no Firebase.
export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    return { error: 'Usuário não autenticado.' };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { error: 'A URL do serviço de nutrição não está configurada.' };
  }

  try {
    // O payload agora inclui todos os dados necessários para o n8n
    // salvar a refeição no Firestore.
    const payload = {
      action: 'add_meal', // Uma nova ação para o n8n identificar
      userId: userId,
      mealType: data.mealType,
      foods: data.foods,
      date: getLocalDateString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        // Retorna a mensagem de erro do webhook diretamente para o usuário
        throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
    }

    // Como o n8n agora salva no DB, um status 200 OK é suficiente.
    return { success: true };

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
