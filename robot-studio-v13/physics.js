'use strict';

// SI units; headless and browser share this exact controller/plant implementation.
// The chassis is constrained to a level plane. Wheel-ground traction is a force
// model; the tire and fork use Rapier rigid-body contacts, never a pickup weld.
const DT = 1 / 120;
const {createArena}=require('../robot-studio-v11/arenas');
const {validateAssemblySpec,resolveAssembly,buildColliderRegistry}=require('./assembly-spec');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const yawOf = q => Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
const quat = yaw => ({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
const DEFAULTS = Object.freeze({ chassisMass: 1.35, tireMass: 0.08, traction: 0.65,
  tireFriction: 0.8, motorTorque: 0.12, maxSpeed: 0.24, wheelRadius: 0.04,
  track: 0.190, liftForce: 8, liftSpeed: 0.035, liftHeight: 0.15, tireOffset: 0,
  obstacles: true, tirePresent: true, blocked: false });

function validateParameters(p) {
  const ranges = {chassisMass:[0.2,8],tireMass:[0.01,3],traction:[0.001,1.5],tireFriction:[0,2],
    motorTorque:[0.001,1],maxSpeed:[0.05,0.5],wheelRadius:[0.03,0.05],track:[0.15,0.3],
    liftForce:[0,30],liftSpeed:[0.005,0.1],liftHeight:[0.025,0.2],tireOffset:[-0.15,0.15]};
  for (const [key,value] of Object.entries(p)) {
    if (key in ranges) { const [lo,hi]=ranges[key];if(!Number.isFinite(value)||value<lo||value>hi)throw Error(`Invalid ${key}: ${value}`); }
    else if (['obstacles','tirePresent','blocked'].includes(key)) {if(typeof value!=='boolean')throw Error(`Invalid ${key}`);}
    else throw Error(`Unknown physical parameter: ${key}`);
  }
  return p;
}

// Inflated 2-D occupancy planner. Plans targets, not robot poses: only forces
// move the chassis. Full 3-D colliders remain the final authority on collisions.
function planPath(start, goal, obstacles, margin = 0.16,arena=createArena()) {
  if(![start?.x,start?.z,goal?.x,goal?.z,margin].every(Number.isFinite)||margin<0)throw Error('Finite planner coordinates and nonnegative margin required');
  const {minX:x0,maxX,minZ:z0,maxZ}=arena.bounds,step=arena.gridStep,nx=Math.floor((maxX-x0)/step)+1,nz=Math.floor((maxZ-z0)/step)+1;
  const point=i=>({x:x0+(i%nx)*step,z:z0+Math.floor(i/nx)*step});
  const index=p=>clamp(Math.round((p.z-z0)/step),0,nz-1)*nx+clamp(Math.round((p.x-x0)/step),0,nx-1);
  const clear=p=>p.x>x0+margin&&p.x<maxX-margin&&p.z>z0+margin&&p.z<maxZ-margin&&
    !obstacles.some(r=>{const m=r.kind==='fixture'?.11:margin;return p.x>r.x-r.hx-m&&p.x<r.x+r.hx+m&&p.z>r.z-r.hz-m&&p.z<r.z+r.hz+m;});
  if(!clear(goal))return [];
  // An existing pose can be within the inflation band; physics still prevents
  // overlap. Reject actual out-of-field starts rather than clamping them.
  if(start.x<x0||start.x>maxX||start.z<z0||start.z>maxZ)return [];
  const first=index(start),last=index(goal),open=new Set([first]),came=new Map(),cost=new Map([[first,0]]);
  const segmentClear=(a,b)=>{
    const n=Math.max(1,Math.ceil(distance(a,b)/(step/4)));
    for(let i=0;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;
    return true;
  };
  if(!segmentClear(point(last),goal))return [];
  let found=null;
  while(open.size){
    let current=null,best=Infinity;
    for(const i of open){const score=cost.get(i)+distance(point(i),point(last));if(score<best){best=score;current=i;}}
    if(current===last){found=current;break;}open.delete(current);
    const ix=current%nx,iz=Math.floor(current/nx);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      if(ix+dx<0||ix+dx>=nx||iz+dz<0||iz+dz>=nz)continue;
      const next=current+dx+dz*nx,p=point(next);
      if(!clear(p))continue;
      if(dx&&dz&&(!clear(point(current+dx))||!clear(point(current+dz*nx))))continue;
      const nc=cost.get(current)+Math.hypot(dx,dz)*step;
      if(nc<(cost.get(next)??Infinity)){came.set(next,current);cost.set(next,nc);open.add(next);}
    }
  }
  if(found===null)return [];
  const path=[];for(let i=found;i!==first;i=came.get(i))path.push(point(i));
  path.reverse();if(path.length&&!segmentClear(path.length>1?path.at(-2):start,goal))return [];
  if(path.length)path[path.length-1]={...goal};else if(segmentClear(start,goal))path.push({...goal});return path;
}

class LiveMission {
  constructor(RAPIER, overrides={},options={}) {
    this.R=RAPIER;this.assembly=validateAssemblySpec(options.assembly||require('../derived/cad-v13/assembly-spec.json'));
    this.profileId=options.profileId||'v13-jointed-gate';
    const physicalDefaults={...DEFAULTS,track:this.assembly.physics.trackMm/1000};
    this.parameters=Object.freeze(validateParameters({...physicalDefaults,...overrides}));this.arena=createArena(options.arenaId||'demo',options.fieldData);
    this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=DT;
    this.world.numSolverIterations=12;
    this.time=0;this.laps=0;this.events=[];this.contacts=0;this.collisionSteps=0;
    this.lift=.15;this.liftTarget=.15;this.phase='lap';this.result='running';this.path=[];this.pathIndex=0;
    this.gate=0;this.loopDistance=0;this.carriedSeconds=0;this.supportSteps=0;this.releasedSeconds=0;
    this.gateOpen=0;this.gateTarget=0;this.gateTravel=this.assembly.physics.gateTravelMm/1000;
    this.gateSpeed=this.assembly.physics.gateSpeedMmPerS/1000;
    this.contactCounters={};this.contactSamples=[];this.contactSampleOverflow=0;this.activeContactPairs=new Set();this.colliderNames=new Map();
    this.peakTireHeight=0;this.lastProgress=0;this.lastDistance=Infinity;this.wheelAngles=[0,0];this.command={left:0,right:0};
    this.source={...this.arena.source};this.destination={...this.arena.destination};this.fixtureColliders={source:[],destination:[]};this.releaseDuration=0;this.supportDuration=0;
    this.obstacles=[];this.visualObstacles=[];this.forkColliders=[];
    this.buildWorld();
    this.loop=this.arena.loop.map(p=>({...p}));
    this.log('Live mission started; level-plane differential-drive model');this.navigate(this.loop[0]);
  }
  log(message){this.events.push({time:this.time,message});}
  box(hx,hy,hz,p,parent=null,group=2,friction=.7,name=null){
    const desc=this.R.ColliderDesc.cuboid(hx,hy,hz).setTranslation(p.x,p.y,p.z).setFriction(friction)
      .setCollisionGroups((group<<16)|0xffff);
    const collider=this.world.createCollider(desc,parent||undefined);
    if(name)this.colliderNames.set(collider.handle,name);
    return collider;
  }
  fixedRect(x,z,hx,hz,height,kind='barrier',navigation=true){
    const r={x,z,hx,hz,height,kind};this.visualObstacles.push(r);if(navigation)this.obstacles.push(r);
    this.box(hx,height/2,hz,{x,y:height/2,z});return r;
  }
  stand(p,which){
    // Two outer rails leave room for the two inner lifting fingers to pass.
    for(const s of [-1,1])this.fixtureColliders[which].push(this.box(.057,.009,.004,{x:p.x,y:.009,z:p.z+s*.044},null,2,.7,`${which}-rail-${s}`));
    this.obstacles.push({x:p.x,z:p.z,hx:.057,hz:.048,kind:'fixture'});
  }
  buildWorld(){
    const R=this.R,p=this.parameters;
    this.box(this.arena.board.width/2,.025,this.arena.board.depth/2,{x:0,y:-.025,z:0});
    for(const b of this.arena.barriers)this.fixedRect(b.x,b.z,b.hx,b.hz,b.height,b.kind,b.kind!=='wall');
    if(p.obstacles)for(const b of this.arena.couches)this.fixedRect(b.x,b.z,b.hx,b.hz,b.height,b.kind);
    if(p.blocked)this.fixedRect(.0,-.60,.05,.60,.20,'blocked');
    this.stand(this.source,'source');this.stand(this.destination,'destination');
    this.chassis=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(this.arena.start.x,0,this.arena.start.z)
      .enabledTranslations(true,false,true).enabledRotations(false,true,false).setLinearDamping(.25).setAngularDamping(1).setCanSleep(false).setCcdEnabled(true));
    const registry=buildColliderRegistry(resolveAssembly(this.assembly,{liftMm:0,gateOpen:0}));
    const chassisSpec=registry.find(c=>c.id==='chassis');
    this.chassisCollider=this.world.createCollider(R.ColliderDesc.cuboid(...chassisSpec.halfExtents)
      .setTranslation(...chassisSpec.position).setMass(p.chassisMass).setFriction(.4).setCollisionGroups((1<<16)|(2|4)),this.chassis);
    this.colliderNames.set(this.chassisCollider.handle,'chassis');
    this.fork=this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    // The exact same named cuboids drive rendering, exports and contact evidence.
    for(const r of registry.filter(c=>['lift','gate'].includes(c.motionGroup))){
      const c=this.world.createCollider(R.ColliderDesc.cuboid(...r.halfExtents).setTranslation(...r.position)
        .setFriction(p.tireFriction).setCollisionGroups((8<<16)|(2|4)),this.fork);
      this.colliderNames.set(c.handle,r.id);this.forkColliders.push(c);
      if(r.motionGroup==='gate'){this.frontGate=c;this.frontGateBase={x:r.position[0],y:r.position[1],z:r.position[2]};}
    }
    if(!this.frontGate)throw Error('Assembly gate collider missing');
    this.updateFork(true);
    if(p.tirePresent){
      this.tire=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(this.source.x,.037,this.source.z+p.tireOffset)
        .setLinearDamping(.3).setAngularDamping(.4).setCanSleep(false).setCcdEnabled(true));
      this.tireColliders=[];
      for(let i=0;i<20;i++){
        const a=i*Math.PI/10;
        const collider=this.world.createCollider(R.ColliderDesc.cuboid(.011,.015,.0068)
          .setTranslation(.039*Math.cos(a),0,.039*Math.sin(a)).setRotation(quat(-a))
          .setMass(p.tireMass/20).setFriction(p.tireFriction).setRestitution(0).setCollisionGroups((4<<16)|0xffff),this.tire);
        this.colliderNames.set(collider.handle,`tire-segment-${i}`);this.tireColliders.push(collider);
      }
    }
  }
  updateGate(){
    // One continuous 54 mm prismatic stroke. The gate never disappears or
    // moves below the floor; contact remains active at every intermediate pose.
    this.frontGate.setTranslationWrtParent({x:this.frontGateBase.x+this.gateOpen*this.gateTravel,
      y:this.frontGateBase.y,z:this.frontGateBase.z});
  }
  updateFork(initial=false){
    const p=this.chassis.translation(),q=this.chassis.rotation();this.updateGate();
    if(initial){this.fork.setTranslation({x:p.x,y:this.lift,z:p.z},true);this.fork.setRotation(q,true);}
    else{this.fork.setNextKinematicTranslation({x:p.x,y:this.lift,z:p.z});this.fork.setNextKinematicRotation(q);}
  }
  navigate(goal){
    this.goal={...goal};this.path=planPath(this.chassis.translation(),goal,this.obstacles.filter(o=>o.kind!=='fixture'||!['acquire','place'].includes(this.phase)),.16,this.arena);
    this.pathIndex=0;this.lastProgress=this.time;this.lastDistance=Infinity;
    if(!this.path.length)this.fail('No collision-clear route to target');
  }
  fail(reason){if(this.result!=='running')return;this.result='failed';this.phase='failed';this.log(reason);}
  enter(phase){this.phase=phase;this.phaseStart=this.time;this.log(phase.replace(/-/g,' '));}
  drive(v,w){
    const p=this.parameters,b=this.chassis,q=b.rotation(),yaw=yawOf(q),c=Math.cos(yaw),s=Math.sin(yaw),vel=b.linvel(),omega=b.angvel().y;
    const forward={x:c,z:-s},side={x:s,z:c},linear=vel.x*c-vel.z*s;
    const targets=[v+w*p.track/2,v-w*p.track/2];
    const limit=Math.min(p.motorTorque/p.wheelRadius,p.traction*p.chassisMass*9.81/2);
    b.resetForces(true);b.resetTorques(true);
    for(let i=0;i<2;i++){
      const sign=i===0?1:-1,localSpeed=linear+sign*omega*p.track/2;
      const force=clamp((targets[i]-localSpeed)*p.chassisMass*6,-limit,limit);
      const origin=b.translation(),offset=sign*p.track/2;
      b.addForceAtPoint({x:forward.x*force,y:0,z:forward.z*force},{x:origin.x+side.x*offset,y:.04,z:origin.z+side.z*offset},true);
      this.wheelAngles[i]+=localSpeed/p.wheelRadius*DT;
    }
    const lateral=vel.x*side.x+vel.z*side.z;
    const lateralForce=clamp(-lateral*p.chassisMass*18,-p.traction*p.chassisMass*9.81,p.traction*p.chassisMass*9.81);
    b.addForce({x:side.x*lateralForce,y:0,z:side.z*lateralForce},true);
    this.command={left:targets[0],right:targets[1]};
  }
  follow(){
    const p=this.chassis.translation(),last=distance(p,this.goal);
    if(last<this.lastDistance-.008){this.lastProgress=this.time;this.lastDistance=last;}
    if(last<.022)return true;
    while(this.pathIndex<this.path.length-1&&distance(p,this.path[this.pathIndex])<.025)this.pathIndex++;
    const target=this.path[this.pathIndex]||this.goal;
    const desired=Math.atan2(-(target.z-p.z),target.x-p.x),error=angle(desired-yawOf(this.chassis.rotation()));
    const speed=Math.min(this.parameters.maxSpeed,this.phase==='lap'?.18:.07)*Math.max(0,Math.cos(error))*clamp(last/.10,.12,1)*(Math.abs(error)>.18?0:1);
    this.drive(speed,clamp(error*3,-1.6,1.6));return false;
  }
  align(yaw){const e=angle(yaw-yawOf(this.chassis.rotation()));this.drive(0,clamp(e*3,-1,1));return Math.abs(e)<.035&&Math.abs(this.chassis.angvel().y)<.06;}
  supportContact(){
    if(!this.tire)return false;let touching=false;
    // Load-bearing fork/tray evidence excludes the retention gate. An open
    // gate can still touch a tire already resting independently on a fixture.
    for(const t of this.tireColliders)for(const f of this.forkColliders)if(f!==this.frontGate)this.world.contactPair(t,f,m=>{if(m.numContacts()>0)touching=true;});
    return touching;
  }
  gateContact(){
    if(!this.tire)return false;let touching=false;
    for(const t of this.tireColliders)this.world.contactPair(t,this.frontGate,m=>{if(m.numContacts()>0)touching=true;});
    return touching;
  }
  fixtureContact(which){
    if(!this.tire)return false;let touching=false;
    for(const t of this.tireColliders)for(const f of this.fixtureColliders[which])this.world.contactPair(t,f,m=>{if(m.numContacts()>0)touching=true;});
    return touching;
  }
  recordNamedContacts(){
    if(!this.tire)return;
    const seen=new Set();
    const inspect=(a,b,category)=>{
      this.world.contactPair(a,b,manifold=>{
        if(manifold.numContacts()===0)return;
        const colliderA=this.colliderNames.get(a.handle)||`collider-${a.handle}`;
        const colliderB=this.colliderNames.get(b.handle)||`collider-${b.handle}`;
        const key=`${colliderA}|${colliderB}`;seen.add(key);
        this.contactCounters[key]=(this.contactCounters[key]||0)+1;
        if(!this.activeContactPairs.has(key)){
          const sample={timeS:this.time,phase:this.phase,colliderA,colliderB,category,impulseNs:null};
          if(this.contactSamples.length<512)this.contactSamples.push(sample);else this.contactSampleOverflow++;
        }
      });
    };
    for(const tire of this.tireColliders){
      for(const fork of this.forkColliders)inspect(tire,fork,fork===this.frontGate&&this.gateOpen>.95?'unexpected-contact':'support');
      for(const which of ['source','destination'])for(const fixture of this.fixtureColliders[which])inspect(tire,fixture,'support');
    }
    this.world.contactPairsWith(this.chassisCollider,other=>{
      if(other.collisionGroups()>>>16===2){
        const key=`chassis|${this.colliderNames.get(other.handle)||`environment-${other.handle}`}`;
        seen.add(key);this.contactCounters[key]=(this.contactCounters[key]||0)+1;
        if(!this.activeContactPairs.has(key)&&this.contactSamples.length<512)this.contactSamples.push({timeS:this.time,phase:this.phase,colliderA:'chassis',colliderB:key.split('|')[1],category:'unexpected-contact',impulseNs:null});
      }
    });
    for(const key of seen)this.activeContactPairs.add(key);
    for(const key of [...this.activeContactPairs])if(!seen.has(key))this.activeContactPairs.delete(key);
  }
  controller(){
    const p=this.chassis.translation(),t=this.tire?.translation();
    if(this.result!=='running'){this.drive(0,0);return;}
    if(this.phase==='lap'){
      if(this.follow()){
        this.gate++;
        if(this.gate===this.loop.length){
          this.gate=0;this.laps++;this.log(`Lap ${this.laps}: all ordered physical position gates crossed`);
          if(this.laps===1){this.enter('to-source');this.sourceStage=0;this.navigate(this.arena.sourceApproach[0]);return;}
          if(this.laps===3){this.enter('to-delivery');this.deliveryStage=0;this.navigate(this.arena.destinationApproach[0]);return;}
        }
        this.navigate(this.loop[this.gate]);
      }
    }else if(this.phase==='to-source'){
      const approach=this.arena.sourceApproach;
      if(this.follow()){
        this.sourceStage++;
        if(this.sourceStage===approach.length)this.enter('source-align');else this.navigate(approach[this.sourceStage]);
      }
    }else if(this.phase==='source-align'){
      if(this.align(this.arena.handlingYaw)){this.liftTarget=0;this.gateTarget=1;if(this.lift<.001&&this.gateOpen>.95){this.enter('acquire');this.navigate({x:this.source.x-.166*Math.cos(this.arena.handlingYaw),z:this.source.z});}}
    }else if(this.phase==='acquire'){
      this.lastProgress=this.time;
      const e=(this.goal.x-p.x)*Math.cos(this.arena.handlingYaw);this.drive(e>.005?.035:0,clamp((this.arena.handlingYaw===0?-yawOf(this.chassis.rotation()):angle(this.arena.handlingYaw-yawOf(this.chassis.rotation())))*4,-.3,.3));
      if(e<=.005){this.enter('lift');this.liftTarget=this.parameters.liftHeight;}
    }else if(this.phase==='lift'){
      this.drive(0,0);
      if(this.parameters.liftForce<this.parameters.tireMass*9.81){this.fail('Lift stalled: assumed payload weight exceeds actuator force');return;}
      if(this.lift>.025)this.gateTarget=0;
      if(this.lift>=this.liftTarget-.001){
        const contact=this.supportContact();
        if(contact&&t&&t.y>.07){this.supportSteps++;this.supportDuration=this.supportSteps*DT;if(this.supportSteps>60&&this.gateOpen<.05){this.log('Contact-supported tire lift confirmed with gate closed; no attachment joint');this.enter('source-backout');this.navigate(this.arena.sourceApproach.at(-1));}}
        else {this.supportSteps=0;this.supportDuration=0;if(this.time-this.phaseStart>8)this.fail('Acquisition failed: no elevated tire supported by fork contacts');}
      }
    }else if(this.phase==='source-backout'){
      // Reverse rather than sweeping the long fork into the pit fixtures.
      const e=(p.x-this.goal.x)*Math.cos(this.arena.handlingYaw);this.drive(e>.012?-.07:0,clamp((this.arena.handlingYaw===0?-yawOf(this.chassis.rotation()):angle(this.arena.handlingYaw-yawOf(this.chassis.rotation())))*3,-.5,.5));
      if(e<=.012){this.enter('return-to-course');this.returnStage=0;this.navigate(this.arena.returnApproach[0]);}
    }else if(this.phase==='return-to-course'){
      const goals=this.arena.returnApproach;
      if(this.follow()){this.returnStage++;if(this.returnStage===goals.length){this.enter('lap');this.gate=0;this.navigate(this.loop[0]);}else this.navigate(goals[this.returnStage]);}
    }else if(this.phase==='to-delivery'){
      const approach=this.arena.destinationApproach;
      if(this.follow()){this.deliveryStage++;if(this.deliveryStage===approach.length)this.enter('delivery-align');else this.navigate(approach[this.deliveryStage]);}
    }else if(this.phase==='delivery-align'){
      if(this.align(this.arena.handlingYaw)){this.enter('place');this.navigate({x:this.destination.x-.166*Math.cos(this.arena.handlingYaw),z:this.destination.z});}
    }else if(this.phase==='place'){
      this.lastProgress=this.time;
      const e=(this.goal.x-p.x)*Math.cos(this.arena.handlingYaw);this.drive(e>.005?.035:0,clamp((this.arena.handlingYaw===0?-yawOf(this.chassis.rotation()):angle(this.arena.handlingYaw-yawOf(this.chassis.rotation())))*4,-.3,.3));
      if(e<=.005){this.enter('lower');this.liftTarget=0;this.gateTarget=0;}
    }else if(this.phase==='lower'){
      this.drive(0,0);if(this.lift<.001)this.gateTarget=1;
      if(this.lift<.001&&this.gateOpen>.95){this.enter('release-backout');this.goal={...this.arena.destinationApproach.at(-1)};}
    }else if(this.phase==='release-backout'){
      const e=(p.x-this.goal.x)*Math.cos(this.arena.handlingYaw);this.drive(e>.012?-.07:0,clamp((this.arena.handlingYaw===0?-yawOf(this.chassis.rotation()):angle(this.arena.handlingYaw-yawOf(this.chassis.rotation())))*3,-.5,.5));
      if(e<=.012){this.drive(0,0);
        if(t&&distance(t,this.destination)<.075&&t.y<.065&&!this.supportContact()&&this.fixtureContact('destination'))this.releasedSeconds+=DT;else this.releasedSeconds=0;
        this.releaseDuration=this.releasedSeconds;
        if(this.releasedSeconds>.5){this.log('Tire released onto destination fixture, independently supported');this.enter('park');this.navigate(this.arena.park);}
        else if(this.time-this.phaseStart>12)this.fail('Release failed: tire not independently resting in destination');
      }
    }else if(this.phase==='park'){
      if(this.follow()){this.drive(0,0);this.result='passed';this.enter('complete');this.log('Three live laps, contact pickup, transport, release and parking completed');}
    }
    if(this.supportSteps>60&&this.lift>.05&&this.phase!=='lift'&&t){
      const forward=(t.x-p.x)*Math.cos(yawOf(this.chassis.rotation()))-(t.z-p.z)*Math.sin(yawOf(this.chassis.rotation()));
      if(t.y<.05||forward<.06||forward>.29||distance(t,p)>.32)this.fail('Tire lost during transport');
      else this.carriedSeconds+=DT;
    }
    if(this.time>600)this.fail('Mission time budget exceeded');
    if(!['lift','lower','source-align','delivery-align','release-backout'].includes(this.phase)&&this.time-this.lastProgress>22)this.fail('Controller stalled or blocked; no progress');
  }
  step(withSnapshot=true){
    if(this.disposed)throw Error('Cannot step a disposed mission');
    if(this.result!=='running')return withSnapshot?this.snapshot():undefined;
    this.controller();
    const difference=this.liftTarget-this.lift;
    if(this.parameters.liftForce>=this.parameters.tireMass*9.81||difference<0)this.lift+=clamp(difference,-this.parameters.liftSpeed*DT,this.parameters.liftSpeed*DT);
    const gateDifference=this.gateTarget-this.gateOpen,gateStep=this.gateSpeed*DT/this.gateTravel;
    this.gateOpen=clamp(this.gateOpen+clamp(gateDifference,-gateStep,gateStep),0,1);
    this.updateFork();this.world.step();this.time+=DT;this.recordNamedContacts();
    if(this.tire){const t=this.tire.translation();this.peakTireHeight=Math.max(this.peakTireHeight,t.y);}
    let hit=false;this.world.contactPairsWith(this.chassisCollider,c=>{if(c.collisionGroups()>>>16===2)hit=true;});
    if(hit){this.collisionSteps++;if(!this.wasHit){this.contacts++;this.log('Chassis obstacle contact resolved by physics');}}this.wasHit=hit;
    const p=this.chassis.translation(),t=this.tire?.translation(),q=this.tire?.rotation();
    if(![p.x,p.y,p.z,...(t?[t.x,t.y,t.z,q.x,q.y,q.z,q.w]:[])].every(Number.isFinite))this.fail('Nonfinite physical state');
    return withSnapshot?this.snapshot():undefined;
  }
  snapshot(){
    const p=this.chassis.translation();return {time:this.time,phase:this.phase,result:this.result,laps:this.laps,
      assemblyId:this.assembly.id,assemblyHash:this.assembly.assemblyHash,profileId:this.profileId,
      robot:{x:p.x,y:p.y,z:p.z,yaw:yawOf(this.chassis.rotation())},tire:this.tire?{...this.tire.translation(),rotation:{...this.tire.rotation()}}:null,
      lift:this.lift,gateOpen:this.gateOpen,gateTarget:this.gateTarget,jointPositions:{liftMm:this.lift*1000,gateOpen:this.gateOpen},
      contactCounters:{...this.contactCounters},contactSamples:this.contactSamples.map(s=>({...s})),contactSampleOverflow:this.contactSampleOverflow,
      wheelAngles:[...this.wheelAngles],command:{...this.command},contacts:this.contacts,collisionSteps:this.collisionSteps,
      carriedSeconds:this.carriedSeconds,peakTireHeight:this.peakTireHeight,goal:{...this.goal},path:this.path.slice(this.pathIndex).map(p=>({...p})),events:this.events.map(e=>({...e})),parameters:{...this.parameters},
      arenaId:this.arena.id,arenaQualification:this.arena.qualification,evidence:{supportDuration:this.supportDuration,releaseDuration:this.releaseDuration,sourceSupport:this.fixtureContact('source'),destinationSupport:this.fixtureContact('destination'),loadBearingSupport:this.supportContact(),gateContact:this.gateContact(),finite:[p.x,p.y,p.z].every(Number.isFinite)},
      terminalReason:this.result==='running'?null:this.events.at(-1)?.message,
      model:'Rapier 0.12.0; v13 datum registry; level-plane chassis; force-limited differential traction; ideal position lift; continuous collidable gate; dynamic compound tire'};
  }
  dispose(){if(!this.disposed){this.world.free();this.disposed=true;}}
}
module.exports={DT,DEFAULTS,LiveMission,planPath,validateParameters};