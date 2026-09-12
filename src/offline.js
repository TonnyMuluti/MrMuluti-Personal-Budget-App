const DB_NAME='st-budget-offline'
const DB_VERSION=1
const STORE='sync'

function openDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'))
    const request=indexedDB.open(DB_NAME,DB_VERSION)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'key'})
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
  })
}
async function put(value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function get(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>{db.close();resolve(r.result||null)};r.onerror=()=>{db.close();reject(r.error)}})}
async function del(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
const keyFor=userId=>`budget:${userId}`
export async function queueOfflineSnapshot(userId,data){await put({key:keyFor(userId),userId,data,queuedAt:new Date().toISOString()});return 1}
export async function getOfflineSnapshot(userId){return get(keyFor(userId))}
export async function clearOfflineSnapshot(userId){return del(keyFor(userId))}
export async function pendingOfflineCount(userId){return (await getOfflineSnapshot(userId))?1:0}
