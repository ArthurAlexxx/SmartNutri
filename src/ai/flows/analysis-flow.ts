// src/ai/flows/analysis-flow.ts
'use server';
/**
 * @fileOverview Um fluxo de IA para analisar dados de saúde do usuário e gerar insights.
 *
 * - generateAnalysisInsights - Gera insights acionáveis com base nos dados do usuário.
 * - AnalysisInput - O tipo de entrada para o fluxo.
 * - AnalysisOutput - O tipo de retorno do fluxo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { UserProfile } from '@/types/user';
import type { MealEntry } from '@/types/meal';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';

const AnalysisInputSchema = z.object({
  profile: z.any().describe("O objeto de perfil do usuário, contendo metas como 'targetWeight'."),
  mealEntries: z.array(z.any()).describe("Um array dos registros de refeições do usuário."),
  hydrationEntries: z.array(z.any()).describe("Um array dos registros de hidratação do usuário."),
  weightLogs: z.array(z.any()).describe("Um array dos registros de peso do usuário."),
});
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;


const AnalysisOutputSchema = z.object({
    insights: z.array(z.string()).describe("Um array de 2-3 insights curtos, acionáveis e encorajadores em português."),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;


const prompt = ai.definePrompt({
    name: 'analysisPrompt',
    input: { schema: AnalysisInputSchema },
    output: { schema: AnalysisOutputSchema },
    prompt: `Você é um analista de saúde e nutricionista virtual. Sua tarefa é analisar os dados de saúde de um usuário e fornecer 2-3 insights curtos, objetivos e motivacionais em português.

    Analise os dados fornecidos: perfil do usuário (com metas), registros de refeições, registros de hidratação e registros de peso.

    Seu objetivo é encontrar correlações e padrões. Por exemplo:
    - O peso do usuário se aproximou da meta quando ele consumiu menos calorias ou mais proteínas?
    - O consumo de água influenciou o controle de calorias?
    - Existem tendências de peso visíveis (aumento, diminuição, estagnação)?

    Seja direto e encorajador. Formule os insights como observações amigáveis.

    Exemplos de bons insights:
    - "Notei que nas semanas em que seu consumo médio de calorias ficou abaixo de 2100kcal, seu peso tendeu a diminuir de forma mais consistente. Continue assim!"
    - "Parabéns pela consistência na hidratação! Nos dias em que você bateu a meta de água, seu consumo de calorias também foi mais controlado."
    - "Observei uma leve tendência de aumento no peso nos últimos dias. Que tal revisarmos o consumo de carboidratos nas refeições noturnas?"

    Não gere mais do que 3 insights. Mantenha-os curtos (1-2 frases).

    Dados do Usuário para Análise:
    ---
    Perfil e Metas:
    \`\`\`json
    {{{json profile}}}
    \`\`\`

    Registros de Refeições:
    \`\`\`json
    {{{json mealEntries}}}
    \`\`\`

    Registros de Hidratação:
    \`\`\`json
    {{{json hydrationEntries}}}
    \`\`\`

    Registros de Peso:
    \`\`\`json
    {{{json weightLogs}}}
    \`\`\`
    ---
    `,
});


const analysisFlow = ai.defineFlow(
    {
        name: 'analysisFlow',
        inputSchema: AnalysisInputSchema,
        outputSchema: AnalysisOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output || { insights: [] };
    }
);

export async function generateAnalysisInsights(input: AnalysisInput): Promise<AnalysisOutput> {
    // Sanitize input data to prevent large objects from breaking the prompt
    const sanitizedInput = {
        profile: {
            calorieGoal: input.profile.calorieGoal,
            proteinGoal: input.profile.proteinGoal,
            waterGoal: input.profile.waterGoal,
            weight: input.profile.weight,
            targetWeight: input.profile.targetWeight,
        },
        mealEntries: input.mealEntries.map((e: MealEntry) => ({ 
            date: e.date, 
            totals: e.mealData.totais 
        })),
        hydrationEntries: input.hydrationEntries.map((e: HydrationEntry) => ({ 
            date: e.date, 
            intake: e.intake 
        })),
        weightLogs: input.weightLogs.map((e: WeightLog) => ({ 
            date: e.date, 
            weight: e.weight 
        })),
    };
    return analysisFlow(sanitizedInput);
}
