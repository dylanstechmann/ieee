/* Simulation-coupled 3D scene; procedural nominal geometry, not vendor CAD. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../mule-studio/core'):root.MuleStudioCore,typeof module==='object'&&module.exports?require('../robot-lab-v4/hardware'):root.RobotLabHardware);if(typeof module==='object'&&module.exports)module.exports=api;root.MuleDynamicsScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Mule,Hardware){
  'use strict';
  const IN=1/25.4,M=39.37007874015748;
  const box=(pos,scale,color,material='plastic',extra={})=>({mesh:'bevelBox',pos,scale,color,material,rot:[0,0,0],...extra});
  function pathGeometry(result,id){const raw=result.samples.filter((_,i)=>i%3===0).map(s=>[s.x_m*M,s.y_m*M,.035]),points=raw.filter((p,i)=>!i||Math.hypot(...p.map((x,k)=>x-raw[i-1][k]))>1e-5);if(points.length<2)return null;return Hardware.tubeGeometry({id,points,diameter_in:.035});}
  function buildScene(data,selection,result,index,options={}){
    const state=result.samples[index];if(!state)throw new Error('simulation sample required');const built=Mule.buildItems(data.mule,selection,{exploded:options.exploded||0,showWiring:options.showWiring!==false,xray:Boolean(options.xray)}),items=[];
    for(const source of built.items){const o={...source,pos:[...source.pos],rot:[...source.rot]};if(o.id&&o.id.startsWith('wheel-')){const side=o.id.endsWith('-1')?1:-1,i=side===1?1:0;if(Math.abs(state.slip_m_s[i])>.02)o.color='#b85c31';}
      const x=o.pos[0],y=o.pos[1],co=Math.cos(state.yaw_rad),si=Math.sin(state.yaw_rad);o.pos=[state.x_m*M+x*co-y*si,state.y_m*M+x*si+y*co,o.pos[2]];o.rot[2]+=state.yaw_rad;items.push(o);
    }
    if(!(options.exploded>0))for(const side of[-1,1]){const i=side===1?1:0,angle=state.wheel_angle_rad[i],localX=Math.sin(angle)*13,localZ=built.variant.geometry.wheel_radius_mm+Math.cos(angle)*13,localY=side*(data.mule.config.drive.wheel_center_y_mm+5.8),co=Math.cos(state.yaw_rad),si=Math.sin(state.yaw_rad),x=localX*IN,y=localY*IN;items.push({mesh:'bevelBox',pos:[state.x_m*M+x*co-y*si,state.y_m*M+x*si+y*co,localZ*IN],scale:[3*IN,1.5*IN,26*IN],material:'wheelHub',color:state.saturated[i]?'#ef6c4d':'#e5c14f',rot:[0,angle,state.yaw_rad],id:`wheel-phase-${side}`});}
    if(options.showMechanism!==false&&!(options.exploded>0)){const z=built.variant.geometry.deck_top_z_mm+7;for(const side of[-1,1])items.push(box([125*IN,side*36*IN,z*IN],[58*IN,4*IN,14*IN],'#d87332','forkOrange',{alpha:.42,id:'passive-fork-envelope-proxy'}));items.push(box([98*IN,0,z*IN],[4*IN,76*IN,14*IN],'#d87332','forkOrange',{alpha:.42,id:'passive-fork-envelope-proxy'}));}
    if(options.showReserved!==false&&!(options.exploded>0))items.push(box([-48*IN,0,(built.variant.geometry.deck_top_z_mm+6)*IN],[34*IN,30*IN,12*IN],'#4d6b85','blackPlastic',{alpha:.38,id:'unselected-driver-controller-reserved-envelope'}));
    const ground=box([18,0,-.16],[78,58,.25],'#303a42','field',{castShadow:false});items.unshift(ground);for(let x=-21;x<=57;x+=3)items.unshift(box([x,0,-.025],[.018,58,.018],'#465560','blackMetal',{castShadow:false}));for(let y=-27;y<=27;y+=3)items.unshift(box([18,y,-.025],[78,.018,.018],'#465560','blackMetal',{castShadow:false}));
    if(options.showPath!==false){const id=`path-${result.scenario_id}-${selection.sku}-${selection.wheel_diameter_mm}-${selection.support_configuration}-${result.mass_kg}`;const geometry=pathGeometry(result,id);if(geometry)items.push({mesh:'custom',pos:[0,0,0],scale:[1,1,1],material:'path',color:'#48c3b1',rot:[0,0,0],geometry,id,alpha:.72,castShadow:false});}
    return{items,state,variant:built.variant};
  }
  return{buildScene,pathGeometry};
});
