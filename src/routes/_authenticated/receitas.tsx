import { createFileRoute } from '@tanstack/react-router';
import { PlanningWorkspace } from '@/components/finance/planning-workspace';
import { financeDataQuery } from '@/lib/finance-data';
import { planningDataQuery } from '@/lib/planning-data';
export const Route=createFileRoute('/_authenticated/receitas')({
 head:()=>({meta:[{title:'Receitas — Meu Organizador'},{name:'description',content:'Receitas pessoais no Meu Organizador.'},{property:'og:title',content:'Receitas — Meu Organizador'},{property:'og:description',content:'Acompanhe seu planejamento financeiro pessoal.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 loader:({context})=>Promise.all([context.queryClient.ensureQueryData(financeDataQuery),context.queryClient.ensureQueryData(planningDataQuery)]),
 component:()=> <PlanningWorkspace view="receitas"/>
});
