(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../mule-dynamics-studio/core'):root.MuleDynamicsScene);if(typeof module==='object'&&module.exports)module.exports=api;root.IntegrationScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(DynamicsScene){
  'use strict';
  const IN=1/25.4,M=1/.0254,mm=p=>p.map(x=>x*IN),metres=p=>p.map(x=>x*M),cache=new Map();
  function box(id,b,color,alpha=.25){return{id,mesh:'bevelBox',pos:mm(b.min.map((v,i)=>(v+b.max[i])/2)),scale:mm(b.min.map((v,i)=>b.max[i]-v)),rot:[0,0,0],color,material:'plastic',alpha};}
  function outline(id,b,color){const items=[],thickness=.45;for(let axis=0;axis<3;axis++){const other=[0,1,2].filter(i=>i!==axis);for(const a of[0,1])for(const c of[0,1]){const min=[...b.min],max=[...b.max];for(const[i,value]of[[other[0],a],[other[1],c]]){const x=value?b.max[i]:b.min[i];min[i]=x-thickness/2;max[i]=x+thickness/2;}items.push(box(`${id}-${axis}-${a}-${c}`,{min,max},color,1));}}return items;}
  function geometry(triangles){const positions=[],normals=[],indices=[];for(const tri of triangles){const base=positions.length/3,a=tri[1].map((v,i)=>v-tri[0][i]),b=tri[2].map((v,i)=>v-tri[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...n)||1;for(const p of tri){positions.push(...p);normals.push(...n.map(x=>x/length));}indices.push(base,base+1,base+2);}return{positions,normals,indices};}
  function tireGeometry(data,c){const key=`tire:${c.orientation}:${c.yaw_deg}:${c.tolerance_id}`;if(cache.has(key))return cache.get(key);const source=data.mechanism.source_tire.mesh_envelope,radial=c.tire.outer_radius_mm/source.enclosing_outer_radius_mm,thickness=c.tire.thickness_mm/source.thickness_mm,angle=c.yaw_deg*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle),center=source.center_mm;
    const vertices=data.tire_vertices.map(p=>{const x=(p[0]-center[0])*radial,y=(p[1]-center[1])*thickness,z=(p[2]-center[2])*radial,flat=[x,-z,y],q=c.orientation==='flat'?flat:[flat[2],flat[1],-flat[0]];return mm([q[0]*co-q[1]*si,q[0]*si+q[1]*co,q[2]]);});
    const triangles=[];for(let i=0;i<vertices.length;i+=3)triangles.push(vertices.slice(i,i+3));const g=geometry(triangles);cache.set(key,g);return g;
  }
  function polygonGeometry(part){const key=JSON.stringify(part);if(cache.has(key))return cache.get(key);const poly=part.polygon,remaining=poly.map((_,i)=>i),triangles=[],area=poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0),sign=Math.sign(area),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    while(remaining.length>3){let found=false;for(let j=0;j<remaining.length;j++){const ids=[remaining[(j+remaining.length-1)%remaining.length],remaining[j],remaining[(j+1)%remaining.length]],a=poly[ids[0]],b=poly[ids[1]],c=poly[ids[2]];if(sign*cross(a,b,c)<=1e-9)continue;if(remaining.some(k=>!ids.includes(k)&&sign*cross(a,b,poly[k])>=-1e-9&&sign*cross(b,c,poly[k])>=-1e-9&&sign*cross(c,a,poly[k])>=-1e-9))continue;triangles.push(ids);remaining.splice(j,1);found=true;break;}if(!found)throw new Error('cannot triangulate mechanism polygon');}triangles.push(remaining);
    const faces=[],z0=part.box.min[2],z1=part.box.max[2];for(const t of triangles){faces.push(t.map(i=>mm([...poly[i],z1])));faces.push([...t].reverse().map(i=>mm([...poly[i],z0])));}for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];faces.push([[...a,z0],[...b,z0],[...b,z1]].map(mm),[[...a,z0],[...b,z1],[...a,z1]].map(mm));}const g=geometry(faces);cache.set(key,g);return g;
  }
  function componentItems(data){const items=[];for(const[id,x,y,count]of[['g2-18v17-pair',-45,0,2],['pico2',5,0,1]]){const c=[...data.electrical.drivers,...data.electrical.controllers].find(c=>c.id===id),d=c.dimensions_mm;if(!d||!d[0]||!d[1])continue;for(let i=0;i<count;i++){const cy=y+(i-(count-1)/2)*30;items.push(box(`${id}-footprint-height-unknown-${i}`,{min:[x-d[0]/2,cy-d[1]/2,25],max:[x+d[0]/2,cy+d[1]/2,25.4]},'#60b99c',.7));}}return items;}
  function presentationFrame(c,index){
    const frame=c.frames[index];if(!frame)throw new Error('unknown mechanism sample');
    const reference=c.frames[0].tire_center_mm;
    return{frame,reference,offset:reference.map((v,i)=>v-frame.tire_center_mm[i])};
  }
  function shiftBox(b,offset){return{min:b.min.map((v,i)=>v+offset[i]),max:b.max.map((v,i)=>v+offset[i])};}
  function sampledPresentationBox(c){
    const boxes=c.frames.map((_,i)=>{const p=presentationFrame(c,i);return shiftBox(p.frame.assembly_box,p.offset);});
    return{min:[0,1,2].map(i=>Math.min(...boxes.map(b=>b.min[i]))),max:[0,1,2].map(i=>Math.max(...boxes.map(b=>b.max[i])))};
  }
  function buildScene(data,workspace,result,index,caseIndex,options={}){
    const fallback=result||data.stopping.runs[0],adapted={...fallback,samples:fallback.samples.map(s=>({...s,saturated:[false,false]}))},scene=DynamicsScene.buildScene({mule:data.mule},data.mule.selected,adapted,workspace==='drivetrain'?index:0,{showMechanism:false,showReserved:false,showPath:workspace==='drivetrain',showWiring:workspace==='drivetrain'});
    if(workspace==='drivetrain')return scene;
    // Present the same source-relative kinematics with a stationary tire and
    // prescribed robot approach. No driving, acquisition or retention is solved.
    const origin=fallback.samples[0];if(origin.x_m!==0||origin.y_m!==0||origin.yaw_rad!==0)throw new Error('mechanism source base must start at origin');
    const c=data.mechanism.cases[caseIndex];if(!c)throw new Error('unknown mechanism case');
    const p=presentationFrame(c,index),frame=p.frame,offset=p.offset,offsetIn=mm(offset);
    scene.items=scene.items.filter(o=>!o.id?.startsWith('wheel-phase')).map(o=>{
      if(o.castShadow===false)return{...o,presentation_group:'environment'};
      return{...o,presentation_group:'robot',pos:o.pos.map((v,i)=>v+offsetIn[i])};
    });
    scene.items.push({id:'organizer-tire-visual-mesh-not-collision',presentation_group:'tire',mesh:'custom',geometry:tireGeometry(data,c),pos:mm(p.reference),scale:[1,1,1],rot:[0,0,0],material:'rubber',color:'#353e48'});
    for(const part of frame.parts){
      const contact=frame.contacts.find(x=>x.part===part.id),color=contact?(contact.intended_contact?'#e7b451':'#e76e5b'):'#dd8b52';
      if(part.polygon)scene.items.push({id:part.id,presentation_group:'mechanism',mesh:'custom',geometry:polygonGeometry(part),pos:offsetIn,scale:[1,1,1],rot:[0,0,0],material:'plastic',color});
      else{const b=shiftBox(part.box,offset);scene.items.push({...box(part.id,b,color,.8),presentation_group:'mechanism',mesh:'cylinder',scale:[part.radius*IN,part.radius*IN,(b.max[2]-b.min[2])*IN]});}
    }
    if(options.proxies!==false){
      scene.items.push(...outline('tire-collision-enclosing-box',shiftBox(frame.tire_box,offset),'#57cbbb').map(o=>({...o,presentation_group:'tire-proxy'})));
      for(const o of data.mechanism.obstacles.filter(o=>!['deck','wheel--1','wheel-1','motor--1','motor-1'].includes(o.id)))scene.items.push(...outline(o.id,shiftBox(o,offset),'#8199ce').map(x=>({...x,presentation_group:'robot-proxy'})));
    }
    if(options.swept)scene.items.push(...outline('sample-union-enclosing-box',sampledPresentationBox(c),'#b28be0').map(o=>({...o,presentation_group:'sample-union'})));
    if(options.components!==false)scene.items.push(...componentItems(data).map(o=>({...o,presentation_group:'robot',pos:o.pos.map((v,i)=>v+offsetIn[i])})));
    const presentation={coordinate_frame:'stationary-tire-presentation',source_frame:'robot-fixed-relative-kinematics',robot_offset_mm:[...offset],tire_center_mm:[...p.reference],source_tire_center_mm:[...frame.tire_center_mm],prescribed_approach_not_driving:true};
    return{...scene,mechanism_case:c,mechanism_frame:frame,presentation};
  }
  return{mm,metres,box,outline,geometry,tireGeometry,polygonGeometry,componentItems,presentationFrame,shiftBox,sampledPresentationBox,buildScene};
});