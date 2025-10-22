// src/app/actions/meal-actions.ts
'use server';

import { getLocalDateString } from '@/lib/date-utils';
import type { Totals } from '@/types/meal';

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

interface GetNutritionalInfoResult {
    error?: string;
    totals?: Totals;
}

/**
 * Esta Server Action tem a ÚNICA responsabilidade de se comunicar com o webhook do n8n
 * para obter os dados nutricionais de uma refeição. Ela não interage com o banco de dados.
 * 
 * @param userId - O ID do usuário (para logs no n8n).
 * @param data - Os dados da refeição enviados pelo formulário.
 * @returns Um objeto com os totais nutricionais ou uma mensagem de erro.
 */
export async function getNutritionalInfo(userId: string, data: AddMealFormData): Promise<GetNutritionalInfoResult> {
    if (!userId) {
        return { error: 'Usuário não autenticado.' };
    }

    const webhookUrl = 'https://n8n.srv1061126.hstgr.cloud/webhook-test/881ba59f-a34a-43e9-891e-483ec8f7b1ef';
    if (!webhookUrl) {
        console.error('[getNutritionalInfo] Falha: A URL do webhook não está definida.');
        return { error: 'A URL do serviço de nutrição não está configurada corretamente no servidor.' };
    }

    try {
        const formattedFoods = data.foods.map(food => `${food.portion}${food.unit} de ${food.name}`).join(', ');

        const payload = {
            action: 'add_meal',
            userId: userId,
            mealType: data.mealType,
            foods: formattedFoods,
            date: getLocalDateString(),
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getNutritionalInfo] Falha: Webhook retornou um erro ${response.status}. Resposta: ${errorText}`);
            throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
        }

        const webhookResponse = await response.json();

        // A resposta do n8n é um array com um objeto, e o output é uma string JSON
        const nutritionalResultString = webhookResponse[0]?.output;
        if (!nutritionalResultString) {
            throw new Error('A resposta do webhook não contém o campo "output" esperado.');
        }

        // Parse da string JSON para obter o objeto de resultado
        const parsedResult = JSON.parse(nutritionalResultString);
        const webhookTotals = parsedResult.resultado;

        if (!webhookTotals) {
            throw new Error('O resultado nutricional não foi encontrado na resposta do webhook.');
        }

        // Mapeia a resposta do webhook para a estrutura de Totals do nosso app
        const totals: Totals = {
            calorias: webhookTotals.calorias_kcal,
            proteinas: webhookTotals.proteinas_g,
            carboidratos: webhookTotals.carboidratos_g,
            gorduras: webhookTotals.gorduras_g,
            fibras: webhookTotals.fibras_g || 0, // Fibras pode ser opcional
        };
        
        return { totals };

    } catch (error: any) {
        console.error("[getNutritionalInfo] Falha Crítica na Server Action:", error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao processar sua refeição.' };
    }
}
