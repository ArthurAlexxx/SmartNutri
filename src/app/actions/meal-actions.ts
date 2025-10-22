
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

export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    console.error('[addMealEntry] Falha: ID do usuário não fornecido.');
    return { error: 'Usuário não autenticado. A autenticação é necessária.' };
  }

  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[addMealEntry] Falha: A variável de ambiente NEXT_PUBLIC_N8N_WEBHOOK_URL não está configurada no servidor.');
    return { error: 'A URL do serviço de nutrição não está configurada corretamente no servidor.' };
  }
  console.log('[addMealEntry] Info: URL do Webhook encontrada.');

  try {
    const payload = {
      action: 'add_meal',
      userId: userId,
      mealType: data.mealType,
      foods: data.foods,
      date: getLocalDateString(),
    };
    console.log('[addMealEntry] Info: Enviando o seguinte payload para o n8n:', JSON.stringify(payload));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    console.log(`[addMealEntry] Info: Webhook retornou o status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[addMealEntry] Falha: Webhook retornou um erro ${response.status}. Resposta: ${errorText}`);
        // Retorna a mensagem de erro do webhook diretamente para o usuário
        throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
    }

    // O n8n agora salva no DB, então um status 200 OK é suficiente.
    console.log('[addMealEntry] Sucesso: Refeição processada e salva pelo n8n.');
    return { success: true };

  } catch (error: any) {
    console.error("[addMealEntry] Falha Crítica na Server Action:", error);
    // Retorna a mensagem de erro da exceção para o cliente
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
