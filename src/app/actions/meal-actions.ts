
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

  // URL de teste fixada temporariamente para depuração
  const webhookUrl = "https://n8n.srv1061126.hstgr.cloud/webhook-test/881ba59f-a34a-43e9-891e-483ec8f7b1ef";
  
  if (!webhookUrl) {
    console.error('[addMealEntry] Falha: A URL do webhook não está definida.');
    return { error: 'A URL do serviço de nutrição não está configurada corretamente no servidor.' };
  }
  console.log('[addMealEntry] Info: Usando URL de Webhook de teste.');

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
