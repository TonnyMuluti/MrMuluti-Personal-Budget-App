import{useEffect,useState}from'react'
export function usePWA(){
  const[online,setOnline]=useState(()=>navigator.onLine),[installEvent,setInstallEvent]=useState(null),[updateReady,setUpdateReady]=useState(false),[registration,setRegistration]=useState(null)
  useEffect(()=>{
    const onOnline=()=>setOnline(true),onOffline=()=>setOnline(false),before=e=>{e.preventDefault();setInstallEvent(e)}
    window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);window.addEventListener('beforeinstallprompt',before)
    let reg
    if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').then(r=>{reg=r;setRegistration(r);if(r.waiting)setUpdateReady(true);r.addEventListener('updatefound',()=>{const w=r.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)setUpdateReady(true)})})}).catch(console.error)}
    return()=>{window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);window.removeEventListener('beforeinstallprompt',before);if(reg?.installing)reg.installing.onstatechange=null}
  },[])
  const install=async()=>{if(!installEvent)return false;installEvent.prompt();const result=await installEvent.userChoice;setInstallEvent(null);return result.outcome==='accepted'}
  const applyUpdate=()=>{if(registration?.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true})}else window.location.reload()}
  const checkForUpdate=async()=>{try{await registration?.update()}catch(e){console.error(e)}}
  return{online,canInstall:!!installEvent,install,updateReady,applyUpdate,checkForUpdate}
}
