'use strict';

// One coordinate contract for viewer instances and exported assembly studies.
// Render units metres, +Y up, +X forward, wheels rotate around local Z.
const {resolve}=require('./dimensions');
const {assemblyPrimitives}=require('./assembly-primitives');
function assemblyInstances(config){
  const g=resolve(config),d=config.dimensions,items=[];
  const add=(id,part,component,position,rotationY=0,scale=[1,1,1],motion='fixed')=>items.push({id,partId:part,assetId:`${part}-${component}`,position,rotationY,scale,motion});
  add('deck','deck','body',[0,g.deckBottomMm/1000,0]);
  for(const side of [-1,1]){
    const y=side<0?Math.PI:0,name=side<0?'left':'right';
    for(const part of ['motor','bracket']){
      for(const component of part==='motor'?['housing','shaft']:['body'])add(`${name}-${part}-${component}`,part,component,[0,g.axleHeightMm/1000,-side*.074],y);
    }
    for(const component of ['tire','rim'])add(`${name}-wheel-${component}`,'wheel',component,[0,g.axleHeightMm/1000,-side*d.halfTrackMm/1000],y,[d.wheelDiameterMm/80,d.wheelDiameterMm/80,1],`${name}-wheel`);
    add(`${name}-hub`,'hub','body',[0,g.axleHeightMm/1000,-side*(d.halfTrackMm/1000-.005)],y,[1,1,1],`${name}-wheel`);
  }
  for(const x of [-.075,.075]){
    add(`riser-${x}`,'riser','body',[x,(g.deckBottomMm-g.casterRiserMm)/1000,0],0,[1,g.casterRiserMm/6.91,1]);
    for(const c of ['body','ball'])add(`caster-${x}-${c}`,'caster',c,[x,0,0]);
  }
  return {schema:'assembly-instances-v11/1',configurationId:config.id,revision:config.revision,units:'m',axis:'X forward, Y up, Z right',stack:g,instances:items,
    primitives:assemblyPrimitives(config),limitations:['Approximate purchased exteriors','Motor mating-length conflict unresolved','Proposed mechanism and generic electronics reservations are not selected hardware']};
}
module.exports={assemblyInstances};