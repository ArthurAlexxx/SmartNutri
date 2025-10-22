
'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase/firestore'; // Note: This is from the CLIENT SDK, but used for type casting on return
import { getLocalDateString } from '@/lib/date-utils';

// Helper function to initialize admin app securely
const initializeAdminApp = () => {
    if (getApps().some(app => app.name === 'admin')) {
        return getFirestore('admin');
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('A chave da conta de serviço do Firebase não está configurada no ambiente.');
    }
    
    const serviceAccount = JSON.parse(serviceAccountString);

    const adminApp = initializeApp({
        credential: cert(serviceAccount)
    }, 'admin');
    
    return getFirestore(adminApp);
};


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

  let dbAdmin;
  try {
      dbAdmin = initializeAdminApp();
  } catch (error: any) {
      console.error("Erro ao inicializar Firebase Admin:", error);
      return { error: 'Falha ao conectar com o serviço de banco de dados.' };
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
      throw new Error(`O webhook de nutrição retornou um erro: ${response.statusText}`);
    }

    const responseArray = await response.json();
    const rawOutput = responseArray[0]?.output;
    
    if (!rawOutput) {
       throw new Error('Formato de resposta do webhook inesperado.');
    }
    
    const jsonString = rawOutput.replace(/```json\n/g, "").replace(/\n```/g, "");
    const nutritionData = JSON.parse(jsonString);

    const mealDataResult = nutritionData.resultado;

    if (!mealDataResult) {
      throw new Error('O serviço não retornou informações para os alimentos informados. Verifique se os nomes estão corretos.');
    }

    const mealEntryData = {
      userId: userId,
      date: getLocalDateString(),
      mealType: data.mealType,
      mealData: {
        alimentos: data.foods.map(f => ({
          nome: f.name,
          porcao: f.portion,
          unidade: f.unit,
          calorias: 0,
          proteinas: 0,
          carboidratos: 0,
          gorduras: 0,
          fibras: 0,
        })),
        totais: {
          calorias: mealDataResult.calorias_kcal || 0,
          proteinas: mealDataResult.proteinas_g || 0,
          carboidratos: mealDataResult.carboidratos_g || 0,
          gorduras: mealDataResult.gorduras_g || 0,
          fibras: mealDataResult.fibras_g || 0,
        }
      },
      createdAt: Timestamp.now(), // Firestore client-side Timestamp
    };

    // Use dbAdmin (Admin SDK) to write data
    const docRef = await dbAdmin.collection('meal_entries').add(mealEntryData);

    const finalMealEntry = { ...mealEntryData, id: docRef.id };

    return { mealEntry: finalMealEntry };

  } catch (error: any) {
    console.error("Error in addMealEntry server action:", error);
    return { error: error.message || 'Ocorreu um erro desconhecido.' };
  }
}
