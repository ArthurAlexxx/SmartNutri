// src/lib/tutorial-steps.ts
import { PopoverProps } from '@radix-ui/react-popover';

export interface TutorialStep {
  elementId: string;
  title: string;
  description: string;
  side?: PopoverProps['side'];
  path?: string;
}

export const tutorialSteps: TutorialStep[] = [
  // Dashboard Page
  {
    elementId: 'add-meal-button',
    title: '1. Adicione sua Refeição',
    description: 'Clique aqui para registrar o que você comeu e obter uma análise nutricional completa.',
    side: 'bottom',
    path: '/dashboard',
  },
  {
    elementId: 'summary-cards',
    title: '2. Acompanhe seus Nutrientes',
    description: 'Aqui você vê o resumo de calorias e macronutrientes consumidos no dia.',
    side: 'right',
    path: '/dashboard',
  },
  {
    elementId: 'water-tracker-card',
    title: '3. Registre sua Hidratação',
    description: 'Use este card para registrar seu consumo de água e acompanhar sua meta diária.',
    side: 'right',
    path: '/dashboard',
  },
  {
    elementId: 'user-profile-button',
    title: '4. Ajuste suas Metas',
    description: 'Clique no seu perfil para ajustar suas metas de calorias, peso e outras configurações a qualquer momento.',
    side: 'bottom',
    path: '/dashboard',
  },
  // History Page
  {
    elementId: 'nav-history',
    title: 'Veja seu Histórico',
    description: 'Acesse o histórico completo de suas refeições e consumo de água para acompanhar sua jornada.',
    side: 'right',
    path: '/history',
  },
  // Analysis Page
  {
    elementId: 'nav-analysis',
    title: 'Análise com IA',
    description: 'Nesta seção (Premium), você terá acesso a gráficos detalhados e insights gerados por IA sobre seu progresso.',
    side: 'right',
    path: '/analysis',
  },
];
