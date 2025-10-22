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

// Esta função agora apenas encaminha os dados para o webhook n8n,
// que é responsável por processar e salvar no Firestore.
export async function addMealEntry(userId: string, data: AddMealFormData) {
  if (!userId) {
    return { error: 'Usuário não autenticado.' };
  }

  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { error: 'A URL do webhook de nutrição não está configurada.' };
  }

  // A string combinada é usada pelo n8n para a análise nutricional.
  const combinedFoodString = data.foods
    .map(food => `${food.portion}${food.unit} de ${food.name}`)
    .join(' e ');

  try {
    // O payload é enviado para o n8n para ser processado.
    const payload = {
      action: 'ref', // 'ref' significa 'refeição' para o webhook
      alimento: combinedFoodString,
      userId: userId,
      mealType: data.mealType,
      date: getLocalDateString(),
      foods: data.foods, // Enviamos os alimentos crus também
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error response:", errorText);
        // Retornamos o erro do webhook para o cliente para uma melhor depuração.
        throw new Error(`O serviço de nutrição retornou um erro: ${response.statusText}`);
    }

    // O webhook n8n retorna o objeto da refeição já com os dados nutricionais.
    const responseData = await response.json();
    
    // Verificamos se o webhook retornou os dados esperados.
    if (responseData && responseData.id) {
        // A escrita no banco de dados agora é feita pelo n8n.
        // Apenas retornamos os dados para o cliente.
        return { mealEntry: responseData };
    } else {
        // Se a resposta do webhook não tiver o formato esperado.
        throw new Error('Formato de resposta do webhook inesperado.');
    }

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    // Retornamos uma mensagem de erro genérica e amigável.
    return { error: error.message || 'Ocorreu um erro desconhecido ao contatar o serviço de nutrição.' };
  }
}
