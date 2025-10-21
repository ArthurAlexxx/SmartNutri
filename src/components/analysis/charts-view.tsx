// src/components/analysis/charts-view.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard-charts';
import { TrendingUp, GlassWater, Weight } from 'lucide-react';

interface ChartsViewProps {
  caloriesData: any[];
  hydrationData: any[];
  weightData: any[];
}

export default function ChartsView({ caloriesData, hydrationData, weightData }: ChartsViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="shadow-sm rounded-2xl animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Consumo de Calorias
          </CardTitle>
          <CardDescription>Sua ingestão de calorias ao longo do período selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardCharts chartType="calories" data={caloriesData} />
        </CardContent>
      </Card>
      <Card className="shadow-sm rounded-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            <GlassWater className="h-5 w-5 text-primary" />
            Consumo de Água
          </CardTitle>
          <CardDescription>Sua ingestão de água ao longo do período selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardCharts chartType="hydration" data={hydrationData} />
        </CardContent>
      </Card>
      <Card className="shadow-sm rounded-2xl animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold text-lg">
              <Weight className="h-5 w-5 text-primary" />
              Acompanhamento de Peso
            </CardTitle>
            <CardDescription>Sua evolução de peso ao longo do período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCharts chartType="weight" data={weightData} />
          </CardContent>
        </Card>
    </div>
  );
}
