'use strict';

const fieldPoint=(x,y)=>({x:(x-48)*.0254,z:-(y-24)*.0254});
function fieldRect(rect,height,kind='barrier'){
  const p=fieldPoint((rect[0]+rect[2])/2,(rect[1]+rect[3])/2);
  return {...p,hx:(rect[2]-rect[0])*.0127,hz:(rect[3]-rect[1])*.0127,height,kind};
}
function createArena(id='demo',fieldData=null){
  if(id==='demo')return {id,label:'Enlarged demonstration arena',board:{width:4.86,depth:2.48},
    bounds:{minX:-2.39,maxX:2.39,minZ:-1.18,maxZ:1.18},gridStep:.04,
    barriers:[...[ [0,-1.20,2.42,.013],[0,1.20,2.42,.013],[-2.42,0,.013,1.21],[2.42,0,.013,1.21]].map(([x,z,hx,hz])=>({x,z,hx,hz,height:.102,kind:'wall'})),
      {x:.60,z:0,hx:.72,hz:.04,height:.065,kind:'barrier'},{x:-.92,z:0,hx:.025,hz:.30,height:.065,kind:'barrier'}],
    couches:[{x:.30,z:-.64,hx:.10,hz:.09,height:.16,kind:'couch'},{x:1.1,z:.64,hx:.10,hz:.09,height:.16,kind:'couch'}],
    start:{x:-.50,z:-.78},loop:[{x:-.30,z:-.78},{x:.65,z:-.78},{x:1.70,z:-.78},{x:1.70,z:.78},{x:.65,z:.78},{x:-.30,z:.78},{x:-.50,z:-.78}],
    source:{x:-1.60,z:-.70},destination:{x:-1.60,z:.70},handlingYaw:0,
    sourceApproach:[{x:-1.30,z:-.8},{x:-1.90,z:-.40},{x:-1.90,z:-.70}],
    returnApproach:[{x:-1.90,z:-.40},{x:-1.30,z:-.8},{x:-.50,z:-.78}],
    destinationApproach:[{x:-1.30,z:.8},{x:-1.90,z:.40},{x:-1.90,z:.70}],park:{x:-1.90,z:.30},
    provenance:'Agent-authored enlarged demonstration, fictional couch props',qualification:'not competition geometry'};
  if(id!=='organizer')throw Error(`Unknown arena: ${id}`);
  if(!fieldData?.features)throw Error('Organizer CAD extraction required');
  const f=fieldData.features,faces=f.walls.inner_faces,point=fieldPoint;
  const barriers=[[0,0,96,1],[0,47,96,48],[0,1,1,47],[95,1,96,47]].map(r=>fieldRect(r,f.walls.height_in*.0254,'wall'));
  barriers.push(fieldRect(f.center_divider.rect,f.center_divider.height_in*.0254),fieldRect(f.pit_divider.rect,f.pit_divider.height_in*.0254));
  return {id,label:'Organizer CAD field — live study',board:{width:96*.0254,depth:48*.0254},gridStep:.015,
    bounds:{minX:point(faces.x_min,24).x,maxX:point(faces.x_max,24).x,minZ:point(48,faces.y_max).z,maxZ:point(48,faces.y_min).z},
    barriers,couches:[],start:point(36,10),loop:[[40,10],[62,10],[86,14],[88,32],[62,38],[36,38],[36,10]].map(p=>point(...p)),
    source:point(7,9),destination:point(7,39),handlingYaw:Math.PI,sourceApproach:[[36,9],[19.5,9],[18.8,9]].map(p=>point(...p)),
    returnApproach:[[19.5,9],[36,9],[36,10]].map(p=>point(...p)),destinationApproach:[[36,39],[19.5,39],[18.8,39]].map(p=>point(...p)),
    park:point(19.479,39),provenance:'derived/organizer-cad-v10/field-v10.json; June 2026 CAD; proposed rail fixtures, not organizer tire hardware',
    qualification:'live geometry attempt; not scoring qualification; tire rails proposed within pit boxes, not organizer mechanism; no couch props'};
}
module.exports={fieldPoint,fieldRect,createArena};