'use strict';
const {resolve}=require('./dimensions');
function assemblyPrimitives(config){
  const g=resolve(config),p=[];
  const add=(id,partId,size,position,color,motion='fixed',basis='proposed mechanism; assumed dimensions')=>p.push({id,partId,size,position,color,motion,basis});
  for(const x of [-.075,.075])add(`spacer-${x}`,'caster',[.02032,.003175,.01524],[x,.0151,0],0x50565b,'fixed','archived caster spacer envelope');
  for(const s of [-1,1])add(`fork-${s}`,'lift',[.134,.006,.016],[.164,.005,s*.019],0xe4a653,'lift');
  add('tray-back','lift',[.008,.076,.126],[.105,.047,0],0xe4a653,'lift');
  for(const s of [-1,1])add(`tray-side-${s}`,'lift',[.128,.056,.008],[.165,.037,s*.062],0xe4a653,'lift');
  add('gate','lift',[.008,.046,.126],[.228,.032,0],0xd3bb82,'gate');
  add('mast','lift',[.012,.20,.10],[.075,.105,0],0x8d9b9e);
  add('battery-reservation','battery-reservation',[.055,.022,.036],[-.035,g.deckTopMm/1000+.011,0],0x33393e,'fixed','generic packaging reservation; no selected SKU');
  add('controller-reservation','controller-reservation',[.032,.003,.026],[.018,g.deckTopMm/1000+.008,0],0x397d60,'fixed','generic packaging reservation; no selected SKU');
  return p;
}
module.exports={assemblyPrimitives};