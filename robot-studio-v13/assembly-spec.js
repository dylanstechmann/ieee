'use strict';

// v13 placements are millimetres in the robot render frame: X forward, Y up,
// Z right. Vendor-native asset frames are handled by each instance rotation.
const finiteVector=(value,length,name)=>{
  if(!Array.isArray(value)||value.length!==length||!value.every(Number.isFinite))throw Error(`${name} must be a finite vector`);
  return value;
};
const unique=(items,label)=>{
  const ids=new Set();for(const item of items){if(!item||typeof item.id!=='string'||!item.id)throw Error(`${label} ID required`);if(ids.has(item.id))throw Error(`Duplicate ${label} ID: ${item.id}`);ids.add(item.id);}return ids;
};

function validateAssemblySpec(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Assembly specification required');
  if(raw.schema!=='assembly-spec-v13/1'||raw.units!=='mm')throw Error('Unsupported assembly schema or units');
  for(const key of ['id','revision','assemblyHash'])if(typeof raw[key]!=='string'||!raw[key])throw Error(`${key} required`);
  for(const key of ['parts','instances','joints','interfaces','colliders'])if(!Array.isArray(raw[key]))throw Error(`${key} array required`);
  const partIds=unique(raw.parts,'part');unique(raw.instances,'instance');unique(raw.joints,'joint');unique(raw.colliders,'collider');
  const instanceIds=new Set(raw.instances.map(i=>i.id));
  for(const part of raw.parts){
    if(!['purchased','custom','proposed'].includes(part.role))throw Error(`Invalid part role: ${part.id}`);
    if(!['vendor-step','bom-nominal-derived','cadquery-custom','standard-nominal'].includes(part.geometryMode))throw Error(`Invalid geometry mode: ${part.id}`);
  }
  for(const instance of raw.instances){
    if(!partIds.has(instance.partId))throw Error(`Unknown part: ${instance.partId}`);
    if(typeof instance.assetId!=='string'||!instance.assetId)throw Error(`Asset required: ${instance.id}`);
    finiteVector(instance.positionMm,3,`${instance.id} position`);finiteVector(instance.rotationDeg,3,`${instance.id} rotation`);
    finiteVector(instance.scale,3,`${instance.id} scale`);
    if(!instance.scale.every(v=>v===1))throw Error(`Non-unit geometry scale is forbidden: ${instance.id}`);
    if(!['fixed','left-wheel','right-wheel','lift','gate'].includes(instance.motionGroup))throw Error(`Invalid motion group: ${instance.id}`);
  }
  for(const joint of raw.joints){
    if(!instanceIds.has(joint.parentInstanceId)||!instanceIds.has(joint.childInstanceId))throw Error(`Missing joint reference: ${joint.id}`);
    if(!['fixed','continuous','prismatic'].includes(joint.kind))throw Error(`Invalid joint kind: ${joint.id}`);
    const axis=finiteVector(joint.axis,3,`${joint.id} axis`);
    if(Math.abs(Math.hypot(...axis)-1)>1e-9)throw Error(`Joint axis must be normalized: ${joint.id}`);
    finiteVector(joint.limits,2,`${joint.id} limits`);
    if(!(joint.limits[0]<joint.limits[1])||!Number.isFinite(joint.home)||joint.home<joint.limits[0]||joint.home>joint.limits[1])throw Error(`Invalid joint home/limits: ${joint.id}`);
  }
  if(!raw.physics||!Number.isFinite(raw.physics.trackMm)||raw.physics.trackMm<=0)throw Error('Positive physical track required');
  if(!Number.isFinite(raw.physics.gateTravelMm)||raw.physics.gateTravelMm<=0)throw Error('Positive gate travel required');
  return raw;
}

function cadPointToRender(pointMm){finiteVector(pointMm,3,'CAD point');return pointMm.map(v=>v/1000);}

function resolveAssembly(spec,jointPositions={}){
  validateAssemblySpec(spec);
  const liftMm=jointPositions.liftMm??0,gateOpen=jointPositions.gateOpen??0;
  if(!Number.isFinite(liftMm)||liftMm<0||liftMm>150)throw Error('Lift position outside joint limits');
  if(!Number.isFinite(gateOpen)||gateOpen<0||gateOpen>1)throw Error('Gate position outside joint limits');
  const instances=spec.instances.map(source=>{
    const instance={...source,positionMm:[...source.positionMm],rotationDeg:[...source.rotationDeg],scale:[...source.scale]};
    if(instance.motionGroup==='lift'||instance.motionGroup==='gate')instance.positionMm[1]+=liftMm;
    if(instance.motionGroup==='gate')instance.positionMm[0]+=gateOpen*spec.physics.gateTravelMm;
    return {...instance,positionM:cadPointToRender(instance.positionMm),rotationRad:instance.rotationDeg.map(v=>v*Math.PI/180)};
  });
  return {...spec,instances,jointPositions:{liftMm,gateOpen}};
}

function buildColliderRegistry(resolved){
  const p=resolved.physics;
  const chassis={id:'chassis',shape:'cuboid',halfExtents:p.chassisHalfExtentsMm.map(v=>v/2000),
    position:p.chassisPositionMm.map(v=>v/1000),motionGroup:'fixed',collisionRole:'active'};
  const mechanism=resolved.colliders.map(c=>({id:c.id,shape:c.shape,halfExtents:c.halfExtentsMm.map(v=>v/2000),
    position:cadPointToRender(c.positionMm),motionGroup:c.motionGroup,collisionRole:'active'}));
  return [chassis,...mechanism];
}

module.exports={validateAssemblySpec,resolveAssembly,cadPointToRender,buildColliderRegistry};
