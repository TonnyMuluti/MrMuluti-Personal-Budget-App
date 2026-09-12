import { supabase } from './supabase'
const n=v=>Number(v??0)
export async function loadCloudData(userId,fallback){
  const tables=['salary_settings','expenses','transactions','bills','savings_goals','debts','what_if_settings','app_settings','assets','user_preferences','vehicle_payment_history']
  const results=await Promise.all(tables.map(t=>supabase.from(t).select('*').eq('user_id',userId)))
  const err=results.find(r=>r.error)?.error;if(err)throw err
  const [salaryR,expensesR,txR,billsR,goalsR,debtsR,whatR,appR,assetsR,prefR,vehicleR]=results
  const hasCloud=results.some(r=>(r.data||[]).length);if(!hasCloud)return null
  const s=salaryR.data?.[0],expenses=(expensesR.data||[]).sort((a,b)=>a.sort_order-b.sort_order).map(e=>({id:e.id,name:e.name,budget:n(e.monthly_budget)})),byName=Object.fromEntries(expenses.map(e=>[e.name,e.id]))
  const transactions=(txR.data||[]).map(t=>({id:t.id,date:t.transaction_date,description:t.description,type:t.transaction_type,category:t.category,categoryId:byName[t.category]||null,amount:n(t.amount),method:t.payment_method||'',notes:t.notes||'',recurring:!!t.is_recurring,frequency:t.recurrence_frequency||'Monthly',nextDate:t.next_recurrence_date||''}))
  const bills=(billsR.data||[]).map(b=>({id:b.id,name:b.name,dueDay:b.due_day||1,priority:b.priority||'Medium',method:b.payment_method||'',autopay:!!b.autopay}))
  const goals=(goalsR.data||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(g=>({id:g.id,name:g.name,target:n(g.target_amount),saved:n(g.saved_amount),targetDate:g.target_date||'',notes:g.notes||'',priority:g.priority||'Medium',goalType:g.goal_type||'Custom',sortOrder:n(g.sort_order),paused:!!g.paused,minimumMonthly:n(g.minimum_monthly_contribution),allocationWeight:n(g.allocation_weight)||1,milestoneAmount:n(g.milestone_amount)}))
  const debtRows=debtsR.data||[],d=debtRows.find(x=>x.is_vehicle_finance)||debtRows[0],w=whatR.data?.[0],a=appR.data?.[0],pref=prefR.data?.[0]
  return {...fallback,period:a?{year:a.selected_year,month:a.selected_month}:fallback.period,
    salary:s?{basic:n(s.basic_salary),taxableHousing:n(s.taxable_housing),standby:n(s.standby_normal),medicalAid:n(s.medical_aid),normalHours:n(s.normal_overtime_hours),normalRate:n(s.normal_overtime_rate),specialHours:n(s.special_overtime_hours),specialRate:n(s.special_overtime_rate),taxRate:n(s.tax_rate),nonTaxableHousing:n(s.non_taxable_housing)}:fallback.salary,
    expenses,transactions,bills,savingsGoals:goals,
    debt:d?{scheduledBalance:n(d.current_balance),apr:n(d.annual_interest_rate),monthlyInstalment:n(d.monthly_payment),officialMonthsRemaining:d.bank_instalments_remaining||0,officialFinalDate:d.bank_final_instalment_date||'',extraPayment:n(d.extra_payment)}:{scheduledBalance:0,apr:0,monthlyInstalment:0,officialMonthsRemaining:0,officialFinalDate:'',extraPayment:0},
    debts:debtRows.map((x,i)=>({id:x.id||`debt-${i}`,name:x.name||`Debt ${i+1}`,scheduledBalance:n(x.current_balance),apr:n(x.annual_interest_rate),monthlyInstalment:n(x.monthly_payment),officialMonthsRemaining:x.bank_instalments_remaining||0,officialFinalDate:x.bank_final_instalment_date||'',extraPayment:n(x.extra_payment),debtType:x.debt_type||'Other',isVehicle:!!x.is_vehicle_finance,originalFinanceAmount:n(x.original_finance_amount),outstandingPrincipal:n(x.outstanding_principal),balanceBasis:x.balance_basis||'scheduled_payments',vehicleDescription:x.vehicle_description||'',nextPaymentDate:x.next_payment_date||'',financeStartDate:x.finance_start_date||''})).sort((a,b)=>Number(b.isVehicle)-Number(a.isVehicle)),
    assets:(assetsR.data||[]).map(x=>({id:x.id,name:x.name,type:x.asset_type||'Other',value:n(x.current_value)})),
    preferences:pref?{displayName:pref.display_name||fallback.preferences.displayName,theme:pref.theme||'system',accent:pref.accent||'blue',paydayDay:pref.payday_day||25,notifications:!!pref.notifications_enabled,customCategories:Array.isArray(pref.custom_categories)?pref.custom_categories:fallback.preferences.customCategories}:fallback.preferences,
    whatIf:w?{extraIncome:n(w.extra_income),expenseCuts:n(w.expense_cuts),extraSavings:n(w.extra_savings),extraDebt:n(w.extra_debt_payment),emergencyTarget:n(w.emergency_fund_target)}:fallback.whatIf,
    vehiclePayments:(vehicleR.data||[]).map(v=>({id:v.id,date:v.payment_date,regular:n(v.regular_payment),extra:n(v.extra_payment),interest:n(v.interest_amount),principal:n(v.principal_amount),balanceAfter:n(v.balance_after),notes:v.notes||''}))}
}
async function replaceRows(table,userId,rows){const del=await supabase.from(table).delete().eq('user_id',userId);if(del.error)throw del.error;if(!rows.length)return;const ins=await supabase.from(table).insert(rows);if(ins.error)throw ins.error}

export async function deleteCloudRecord(table,userId,id){
  if(!table||!userId||!id)return
  const r=await supabase.from(table).delete().eq('user_id',userId).eq('id',id)
  if(r.error)throw r.error
}

export async function deleteAllDebtData(userId){
  if(!userId)return
  const payments=await supabase.from('vehicle_payment_history').delete().eq('user_id',userId)
  if(payments.error)throw payments.error
  const debts=await supabase.from('debts').delete().eq('user_id',userId)
  if(debts.error)throw debts.error
}
export async function saveCloudData(userId,data){
  const s=data.salary,d=data.debt,w=data.whatIf,p=data.preferences||{}
  const salary={user_id:userId,basic_salary:s.basic,taxable_housing:s.taxableHousing,standby_normal:s.standby,medical_aid:s.medicalAid,normal_overtime_hours:s.normalHours,normal_overtime_rate:s.normalRate,special_overtime_hours:s.specialHours,special_overtime_rate:s.specialRate,tax_rate:s.taxRate,non_taxable_housing:s.nonTaxableHousing},app={user_id:userId,selected_year:data.period.year,selected_month:data.period.month},what={user_id:userId,extra_income:w.extraIncome,expense_cuts:w.expenseCuts,extra_savings:w.extraSavings,extra_debt_payment:w.extraDebt,emergency_fund_target:w.emergencyTarget},pref={user_id:userId,display_name:p.displayName||null,theme:p.theme||'system',accent:p.accent||'blue',payday_day:n(p.paydayDay)||25,notifications_enabled:!!p.notifications,custom_categories:p.customCategories||[]}
  await Promise.all([supabase.from('salary_settings').upsert(salary,{onConflict:'user_id'}),supabase.from('app_settings').upsert(app,{onConflict:'user_id'}),supabase.from('what_if_settings').upsert(what,{onConflict:'user_id'}),supabase.from('user_preferences').upsert(pref,{onConflict:'user_id'})].map(async p=>{const r=await p;if(r.error)throw r.error}))
  await replaceRows('expenses',userId,data.expenses.map((e,i)=>({user_id:userId,name:e.name,category:'Monthly Expense',monthly_budget:n(e.budget),active:true,sort_order:i})))
  await replaceRows('transactions',userId,data.transactions.map(t=>({user_id:userId,transaction_date:t.date,description:t.description||t.category||'Transaction',payment_method:t.method||null,transaction_type:t.type||'Expense',category:t.category||null,amount:n(t.amount),notes:t.notes||null,is_recurring:!!t.recurring,recurrence_frequency:t.frequency||null,next_recurrence_date:t.nextDate||null})))
  await replaceRows('bills',userId,data.bills.map(b=>({user_id:userId,name:b.name,monthly_amount:n(data.expenses.find(e=>e.name===b.name)?.budget),due_day:n(b.dueDay)||1,priority:b.priority||'Medium',payment_method:b.method||null,autopay:!!b.autopay,active:true})))
  await replaceRows('savings_goals',userId,data.savingsGoals.map((g,i)=>({user_id:userId,name:g.name,target_amount:n(g.target),saved_amount:n(g.saved),target_date:g.targetDate||null,notes:g.notes||null,completed:n(g.target)>0&&n(g.saved)>=n(g.target),priority:g.priority||'Medium',goal_type:g.goalType||'Custom',sort_order:Number.isFinite(+g.sortOrder)?+g.sortOrder:i,paused:!!g.paused,minimum_monthly_contribution:n(g.minimumMonthly),allocation_weight:n(g.allocationWeight)||1,milestone_amount:n(g.milestoneAmount)})))
  const debts=(Array.isArray(data.debts)?data.debts:[{name:'Vehicle Finance',...d}]);await replaceRows('debts',userId,debts.map((x,i)=>({user_id:userId,name:x.name||`Debt ${i+1}`,current_balance:n(x.scheduledBalance),annual_interest_rate:n(x.apr),monthly_payment:n(x.monthlyInstalment),extra_payment:n(x.extraPayment),bank_instalments_remaining:n(x.officialMonthsRemaining),bank_final_instalment_date:x.officialFinalDate||null,residual_value:0,arrears_advance:i===0?2.48:0,statement_date:i===0?'2026-08-10':null,calculation_start_date:i===0?'2026-08-25':null,debt_type:x.debtType||'Other',is_vehicle_finance:!!x.isVehicle,original_finance_amount:n(x.originalFinanceAmount)||null,outstanding_principal:n(x.outstandingPrincipal)||null,balance_basis:x.balanceBasis||'scheduled_payments',vehicle_description:x.vehicleDescription||null,next_payment_date:x.nextPaymentDate||null,finance_start_date:x.financeStartDate||null})))
  await replaceRows('assets',userId,(data.assets||[]).map(a=>({user_id:userId,name:a.name,asset_type:a.type||'Other',current_value:n(a.value)})))
  await replaceRows('vehicle_payment_history',userId,(data.vehiclePayments||[]).map(v=>({user_id:userId,debt_id:null,payment_date:v.date,regular_payment:n(v.regular),extra_payment:n(v.extra),interest_amount:n(v.interest),principal_amount:n(v.principal),balance_after:v.balanceAfter===''||v.balanceAfter==null?null:n(v.balanceAfter),notes:v.notes||null})))
}
