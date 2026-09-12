import { supabase } from './supabase'

const num=v=>Number(v??0)

export async function loadHouseholdWorkspace(user){
  if(!user) return {households:[],active:null,members:[],invites:[],receivedInvites:[],transactions:[],bills:[],goals:[],contributions:[],activity:[]}
  const email=(user.email||'').toLowerCase()
  const memberships=await supabase.from('household_members').select('household_id,role,status,permissions,households(id,name,created_by,created_at)').eq('user_id',user.id).eq('status','active')
  if(memberships.error) throw memberships.error
  const created=await supabase.from('households').select('id,name,created_by,created_at').eq('created_by',user.id)
  if(created.error) throw created.error
  const map=new Map()
  for(const m of memberships.data||[]){if(m.households)map.set(m.households.id,{...m.households,role:m.role,permissions:m.permissions||{}})}
  for(const h of created.data||[]){if(!map.has(h.id))map.set(h.id,{...h,role:'Owner',permissions:{}})}
  const households=[...map.values()]
  const active=households[0]||null
  const received=await supabase.from('household_invites').select('id,household_id,invited_email,role,status,expires_at,households(name)').eq('invited_email',email).eq('status','pending')
  if(received.error) throw received.error
  if(!active) return {households,active:null,members:[],invites:[],receivedInvites:received.data||[],transactions:[],bills:[],goals:[],contributions:[],activity:[]}
  return {...await loadHouseholdDetail(active.id),households,active,receivedInvites:received.data||[]}
}

export async function loadHouseholdDetail(householdId){
  const [members,invites,transactions,bills,goals,contributions,activity]=await Promise.all([
    supabase.from('household_members').select('household_id,user_id,role,status,permissions,joined_at').eq('household_id',householdId),
    supabase.from('household_invites').select('id,household_id,invited_email,role,status,expires_at,created_at').eq('household_id',householdId).order('created_at',{ascending:false}),
    supabase.from('household_transactions').select('*').eq('household_id',householdId).order('transaction_date',{ascending:false}).limit(100),
    supabase.from('household_bills').select('*').eq('household_id',householdId).eq('active',true).order('due_day'),
    supabase.from('household_goals').select('*').eq('household_id',householdId).order('sort_order'),
    supabase.from('household_contributions').select('*').eq('household_id',householdId).order('contribution_date',{ascending:false}).limit(100),
    supabase.from('household_activity').select('*').eq('household_id',householdId).order('created_at',{ascending:false}).limit(50)
  ])
  const err=[members,invites,transactions,bills,goals,contributions,activity].find(x=>x.error)?.error
  if(err) throw err
  return {
    members:members.data||[],invites:invites.data||[],
    transactions:(transactions.data||[]).map(x=>({...x,amount:num(x.amount)})),
    bills:(bills.data||[]).map(x=>({...x,monthly_amount:num(x.monthly_amount)})),
    goals:(goals.data||[]).map(x=>({...x,target_amount:num(x.target_amount),saved_amount:num(x.saved_amount)})),
    contributions:(contributions.data||[]).map(x=>({...x,amount:num(x.amount)})),activity:activity.data||[]
  }
}

export async function createHousehold(userId,name){
  const h=await supabase.from('households').insert({name:name.trim(),created_by:userId}).select().single();if(h.error)throw h.error
  const m=await supabase.from('household_members').insert({household_id:h.data.id,user_id:userId,role:'Owner',status:'active',permissions:{transactions:'manage',bills:'manage',goals:'manage',contributions:'manage',reports:'manage'}});if(m.error)throw m.error
  return h.data
}
export async function inviteHouseholdMember(userId,householdId,email,role='Partner'){
  const permissions=role==='Viewer'?{transactions:'view',bills:'view',goals:'view',contributions:'view',reports:'view'}:{transactions:'edit',bills:'edit',goals:'edit',contributions:'edit',reports:'view'}
  const r=await supabase.from('household_invites').insert({household_id:householdId,invited_email:email.trim().toLowerCase(),invited_by:userId,role,permissions});if(r.error)throw r.error
}
export async function acceptHouseholdInvite(inviteId){const r=await supabase.rpc('accept_household_invite',{invite_uuid:inviteId});if(r.error)throw r.error;return r.data}
export async function cancelHouseholdInvite(id){const r=await supabase.from('household_invites').update({status:'cancelled'}).eq('id',id);if(r.error)throw r.error}
export async function updateMemberRole(householdId,userId,role){const r=await supabase.from('household_members').update({role,permissions:role==='Viewer'?{transactions:'view',bills:'view',goals:'view',contributions:'view',reports:'view'}:{transactions:'edit',bills:'edit',goals:'edit',contributions:'edit',reports:'view'}}).eq('household_id',householdId).eq('user_id',userId);if(r.error)throw r.error}
export async function removeHouseholdMember(householdId,userId){const r=await supabase.from('household_members').delete().eq('household_id',householdId).eq('user_id',userId);if(r.error)throw r.error}

export async function addHouseholdTransaction(userId,householdId,row){const r=await supabase.from('household_transactions').insert({household_id:householdId,created_by:userId,transaction_date:row.date,description:row.description,transaction_type:row.type||'Expense',category:row.category||null,payment_method:row.method||null,amount:num(row.amount),notes:row.notes||null});if(r.error)throw r.error;await logActivity(userId,householdId,'Added household transaction','transaction')}
export async function deleteHouseholdTransaction(id){const r=await supabase.from('household_transactions').delete().eq('id',id);if(r.error)throw r.error}
export async function addHouseholdBill(userId,householdId,row){const r=await supabase.from('household_bills').insert({household_id:householdId,created_by:userId,name:row.name,monthly_amount:num(row.amount),due_day:num(row.dueDay)||1,priority:row.priority||'Medium',payment_method:row.method||null,autopay:!!row.autopay,active:true});if(r.error)throw r.error;await logActivity(userId,householdId,'Added household bill','bill')}
export async function deleteHouseholdBill(id){const r=await supabase.from('household_bills').delete().eq('id',id);if(r.error)throw r.error}
export async function addHouseholdGoal(userId,householdId,row){const r=await supabase.from('household_goals').insert({household_id:householdId,created_by:userId,name:row.name,goal_type:row.goalType||'Custom',priority:row.priority||'Medium',target_amount:num(row.target),saved_amount:num(row.saved),target_date:row.targetDate||null,paused:false,sort_order:num(row.sortOrder)||0,notes:row.notes||null});if(r.error)throw r.error;await logActivity(userId,householdId,'Added household goal','goal')}
export async function updateHouseholdGoal(id,patch){const db={};if('saved' in patch)db.saved_amount=num(patch.saved);if('target' in patch)db.target_amount=num(patch.target);if('priority' in patch)db.priority=patch.priority;if('paused' in patch)db.paused=!!patch.paused;if('targetDate' in patch)db.target_date=patch.targetDate||null;const r=await supabase.from('household_goals').update(db).eq('id',id);if(r.error)throw r.error}
export async function deleteHouseholdGoal(id){const r=await supabase.from('household_goals').delete().eq('id',id);if(r.error)throw r.error}
export async function addHouseholdContribution(userId,householdId,row){const r=await supabase.from('household_contributions').insert({household_id:householdId,user_id:userId,contribution_date:row.date,amount:num(row.amount),note:row.note||null});if(r.error)throw r.error;await logActivity(userId,householdId,'Added household contribution','contribution')}
async function logActivity(userId,householdId,action,entityType){await supabase.from('household_activity').insert({household_id:householdId,user_id:userId,action,entity_type:entityType}).then(()=>{})}
