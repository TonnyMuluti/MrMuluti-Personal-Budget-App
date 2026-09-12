import { supabase } from './supabase'

const n = v => Number(v ?? 0)

export async function loadCloudData(userId, fallback) {
  const tables = ['salary_settings','expenses','transactions','bills','savings_goals','debts','what_if_settings','app_settings']
  const results = await Promise.all(tables.map(t => supabase.from(t).select('*').eq('user_id', userId)))
  const err = results.find(r => r.error)?.error
  if (err) throw err
  const [salaryR, expensesR, txR, billsR, goalsR, debtsR, whatR, appR] = results
  const hasCloud = results.some(r => (r.data || []).length)
  if (!hasCloud) return null

  const s = salaryR.data?.[0]
  const expenses = (expensesR.data || []).sort((a,b)=>a.sort_order-b.sort_order).map(e=>({id:e.id,name:e.name,budget:n(e.monthly_budget)}))
  const byName = Object.fromEntries(expenses.map(e=>[e.name,e.id]))
  const transactions = (txR.data || []).map(t=>({id:t.id,date:t.transaction_date,description:t.description,type:t.transaction_type,category:t.category,categoryId:byName[t.category]||null,amount:n(t.amount),method:t.payment_method||'',notes:t.notes||''}))
  const bills = (billsR.data || []).map(b=>({id:b.id,name:b.name,dueDay:b.due_day||1,priority:b.priority||'Medium',method:b.payment_method||'',autopay:!!b.autopay}))
  const goals = (goalsR.data || []).map(g=>({id:g.id,name:g.name,target:n(g.target_amount),saved:n(g.saved_amount),targetDate:g.target_date||'',notes:g.notes||''}))
  const d = debtsR.data?.[0]
  const w = whatR.data?.[0]
  const a = appR.data?.[0]
  return {
    ...fallback,
    period:a?{year:a.selected_year,month:a.selected_month}:fallback.period,
    salary:s?{basic:n(s.basic_salary),taxableHousing:n(s.taxable_housing),standby:n(s.standby_normal),medicalAid:n(s.medical_aid),normalHours:n(s.normal_overtime_hours),normalRate:n(s.normal_overtime_rate),specialHours:n(s.special_overtime_hours),specialRate:n(s.special_overtime_rate),taxRate:n(s.tax_rate),nonTaxableHousing:n(s.non_taxable_housing)}:fallback.salary,
    expenses:expenses.length?expenses:fallback.expenses,
    transactions,
    bills:bills.length?bills:fallback.bills,
    savingsGoals:goals.length?goals:fallback.savingsGoals,
    debt:d?{scheduledBalance:n(d.current_balance),apr:n(d.annual_interest_rate),monthlyInstalment:n(d.monthly_payment),officialMonthsRemaining:d.bank_instalments_remaining||56,officialFinalDate:d.bank_final_instalment_date||'2031-03-25',extraPayment:n(d.extra_payment)}:fallback.debt,
    whatIf:w?{extraIncome:n(w.extra_income),expenseCuts:n(w.expense_cuts),extraSavings:n(w.extra_savings),extraDebt:n(w.extra_debt_payment),emergencyTarget:n(w.emergency_fund_target)}:fallback.whatIf
  }
}

async function replaceRows(table, userId, rows) {
  const del = await supabase.from(table).delete().eq('user_id', userId)
  if (del.error) throw del.error
  if (!rows.length) return
  const ins = await supabase.from(table).insert(rows)
  if (ins.error) throw ins.error
}

export async function saveCloudData(userId, data) {
  const s=data.salary,d=data.debt,w=data.whatIf
  const salary={user_id:userId,basic_salary:s.basic,taxable_housing:s.taxableHousing,standby_normal:s.standby,medical_aid:s.medicalAid,normal_overtime_hours:s.normalHours,normal_overtime_rate:s.normalRate,special_overtime_hours:s.specialHours,special_overtime_rate:s.specialRate,tax_rate:s.taxRate,non_taxable_housing:s.nonTaxableHousing}
  const app={user_id:userId,selected_year:data.period.year,selected_month:data.period.month}
  const what={user_id:userId,extra_income:w.extraIncome,expense_cuts:w.expenseCuts,extra_savings:w.extraSavings,extra_debt_payment:w.extraDebt,emergency_fund_target:w.emergencyTarget}
  await Promise.all([
    supabase.from('salary_settings').upsert(salary,{onConflict:'user_id'}),
    supabase.from('app_settings').upsert(app,{onConflict:'user_id'}),
    supabase.from('what_if_settings').upsert(what,{onConflict:'user_id'})
  ].map(async p=>{const r=await p;if(r.error)throw r.error}))

  await replaceRows('expenses',userId,data.expenses.map((e,i)=>({user_id:userId,name:e.name,category:'Monthly Expense',monthly_budget:n(e.budget),active:true,sort_order:i})))
  await replaceRows('transactions',userId,data.transactions.map(t=>({user_id:userId,transaction_date:t.date,description:t.description||t.category||'Transaction',payment_method:t.method||null,transaction_type:t.type||'Expense',category:t.category||null,amount:n(t.amount),notes:t.notes||null})))
  await replaceRows('bills',userId,data.bills.map(b=>({user_id:userId,name:b.name,monthly_amount:n(data.expenses.find(e=>e.name===b.name)?.budget),due_day:n(b.dueDay)||1,priority:b.priority||'Medium',payment_method:b.method||null,autopay:!!b.autopay,active:true})))
  await replaceRows('savings_goals',userId,data.savingsGoals.map(g=>({user_id:userId,name:g.name,target_amount:n(g.target),saved_amount:n(g.saved),target_date:g.targetDate||null,notes:g.notes||null,completed:n(g.target)>0&&n(g.saved)>=n(g.target)})))
  await replaceRows('debts',userId,[{user_id:userId,name:'Vehicle Finance',current_balance:d.scheduledBalance,annual_interest_rate:d.apr,monthly_payment:d.monthlyInstalment,extra_payment:d.extraPayment,bank_instalments_remaining:d.officialMonthsRemaining,bank_final_instalment_date:d.officialFinalDate,residual_value:0,arrears_advance:2.48,statement_date:'2026-08-10',calculation_start_date:'2026-08-25'}])
}
