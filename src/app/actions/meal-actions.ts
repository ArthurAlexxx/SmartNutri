
// src/app/actions/meal-actions.ts
'use server';

import { getLocalDateString } from '@/lib/date-utils';
import { admin, initializeAdminApp } from '@/lib/firebase/admin';
import type { MealData, MealEntry } from '@/types/meal';
import { Timestamp } from 'firebase-admin/firestore';

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

    const { initError } = initializeAdminApp();
    if (initError) {
        console.error('[addMealEntry] Falha na inicialização do Firebase Admin:', initError);
        return { error: `Falha ao conectar com o serviço de banco de dados: ${initError}` };
    }

    const webhookUrl = "https://n8n.srv1061126.hstgr.cloud/webhook-test/881ba59f-a34a-43e9-891e-483ec8f7b1ef";
    if (!webhookUrl) {
        console.error('[addMealEntry] Falha: A URL do webhook não está definida.');
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
            console.error(`[addMealEntry] Falha: Webhook retornou um erro ${response.status}. Resposta: ${errorText}`);
            throw new Error(`O serviço de nutrição retornou um erro: ${errorText || response.statusText}`);
        }

        const webhookResponse = await response.json();

        // Extrai e parseia o resultado nutricional da resposta do n8n
        const nutritionalResultString = webhookResponse[0]?.output;
        if (!nutritionalResultString) {
            throw new Error('A resposta do webhook não contém o campo "output" esperado.');
        }

        const parsedResult = JSON.parse(nutritionalResultString);
        const totals = parsedResult.resultado;

        if (!totals) {
            throw new Error('O resultado nutricional não foi encontrado na resposta do webhook.');
        }

        // Constrói o objeto da refeição para salvar no Firestore
        const mealData: MealData = {
            alimentos: data.foods.map(f => ({ ...f, calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })),
            totais: {
                calorias: totals.calorias_kcal,
                proteinas: totals.proteinas_g,
                carboidratos: totals.carboidratos_g,
                gorduras: totals.gorduras_g,
                fibras: totals.fibras_g,
            },
        };
        
        const newMealEntry: Omit<MealEntry, 'id'> = {
            userId: userId,
            date: getLocalDateString(),
            mealType: data.mealType,
            mealData: mealData,
            createdAt: Timestamp.now(),
        };

        const db = admin.firestore();
        await db.collection('meal_entries').add(newMealEntry);

        console.log('[addMealEntry] Sucesso: Refeição processada e salva no Firestore.');
        return { success: true };

    } catch (error: any) {
        console.error("[addMealEntry] Falha Crítica na Server Action:", error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao processar sua refeição.' };
    }
}
