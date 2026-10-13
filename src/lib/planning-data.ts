import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentMonth } from './planning';
export const planningDataQuery = queryOptions({ queryKey:['planning-data'], queryFn:async()=>{
  const closing=await supabase.rpc('auto_close_financial_months');
  if(closing.error) throw closing.error;
  const recurrence=await supabase.rpc('ensure_recurring_bills',{target_month:currentMonth()});
  if(recurrence.error) throw recurrence.error;
  const [bills,budgets,withdrawals,closings]=await Promise.all([supabase.from('bills').select('*').order('created_at',{ascending:false}),supabase.from('category_budgets').select('*'),supabase.from('goal_withdrawals').select('*'),supabase.from('month_closings').select('*').order('month',{ascending:false})]);
  for(const result of [bills,budgets,withdrawals,closings]) if(result.error)throw result.error;
  return {bills:(bills.data??[]).map(b=>({...b,amount:Number(b.amount),reference_month:b.reference_month??''})),budgets:budgets.data??[],withdrawals:withdrawals.data??[],closings:closings.data??[]};
}});