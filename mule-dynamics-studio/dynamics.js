(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../mule-studio/core'):root.MuleStudioCore);if(typeof module==='object'&&module.exports)module.exports=api;root.MuleDynamics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Geometry){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=(x,p=6)=>Number(x.toFixed(p));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const lerp=(a,b,t)=>a+(b-a)*t;
function validate(config){
  if(config.status!=='agent-selected-digital-candidates-synthetic-planar-study-not-hardware-validated')throw new Error('explicit synthetic study status required');
  for(const key of['numerics','vehicle','electrical','control','scenarios','requirements'])if(!config[key])throw new Error(`missing ${key}`);
  if(!(config.numerics.dt_s>0&&config.numerics.sample_dt_s>=config.numerics.dt_s))throw new Error('invalid integration/sample steps');
  if(!(config.vehicle.mass_kg>0&&config.vehicle.yaw_inertia_kg_m2>0&&config.vehicle.wheel_inertia_kg_m2>0))throw new Error('positive inertia required');
  if(config.vehicle.driven_weight_fraction<=0||config.vehicle.driven_weight_fraction>1)throw new Error('invalid driven weight fraction');
  if(!(config.electrical.driver_current_limit_a>0&&config.electrical.source_voltage_v>0))throw new Error('positive electrical scenarios required');
  return true;
}
function motorModel(candidate){
  const stallTorque=candidate.stall_torque_kgcm_extrapolated*0.0980665;
  return{sku:candidate.sku,no_load_omega:candidate.no_load_rpm*Math.PI/30,stall_current:candidate.stall_current_a_extrapolated,stall_torque:stallTorque,torque_constant:stallTorque/candidate.stall_current_a_extrapolated,output_cpr:candidate.output_cpr};
}
function command(scenario,t){
  if(scenario.id==='spin'){
    const d=scenario.spin_duration_s||4,ramp=Math.min(1,d/3),peak=Math.PI/(d-ramp);let target=0,rate=0;
    if(t<ramp){rate=peak*t/ramp;target=peak*t*t/(2*ramp);}else if(t<d-ramp){rate=peak;target=peak*(t-ramp/2);}else if(t<d){const u=d-t;rate=peak*u/ramp;target=Math.PI-peak*u*u/(2*ramp);}else target=Math.PI;
    return{speed:0,yaw_target:target,yaw_rate:rate};
  }
  let speed=Math.min(scenario.target_speed_m_s||0,(scenario.acceleration_m_s2||0)*t);
  if(scenario.stop_at_s!==undefined&&t>=scenario.stop_at_s)speed=0;
  return{speed,yaw_target:0,yaw_rate:0};
}
function initialState(){return{t:0,x:0,y:0,yaw:0,v:0,yaw_rate:0,omega:[0,0],wheel_angle:[0,0],integral:[0,0],duty:[0,0],current:[0,0],torque:[0,0],bus_v:0,energy_j:0,saturated:[false,false],slip:[0,0],encoder:[0,0],history:[],dropout:false};}
function measuredEncoders(state,motor,delay,scenario){
  const delayed=state.history[Math.max(0,state.history.length-1-delay)]||[0,0],actual=[state.omega[0],state.omega[1]],result=[];
  for(let i=0;i<2;i++){let value=delayed[i];if(i===0&&scenario.dropout_start_s!==undefined&&state.t>=scenario.dropout_start_s&&state.t<scenario.dropout_end_s)value=state.frozen_encoder??value;result[i]=Math.round(value*motor.output_cpr/(2*Math.PI))*(2*Math.PI/motor.output_cpr);}
  if(scenario.dropout_start_s!==undefined&&state.t>=scenario.dropout_end_s)delete state.frozen_encoder;else if(scenario.dropout_start_s!==undefined&&state.t>=scenario.dropout_start_s&&state.frozen_encoder===undefined)state.frozen_encoder=actual[0];
  return result;
}
function step(state,input,dt){
  const{scenario,motor,config,mass,overrides={}}=input,v=config.vehicle,e=config.electrical,c=config.control;
  const radius=overrides.wheel_radius_m??v.wheel_radius_m,track=overrides.track_m??v.track_m,Iw=v.wheel_inertia_kg_m2;
  const target=command(scenario,state.t),headingRate=clamp(target.yaw_rate+c.heading_kp*wrap(target.yaw_target-state.yaw)-c.heading_kd*state.yaw_rate,-3,3);
  const targetOmega=[(target.speed-track*headingRate/2)/radius,(target.speed+track*headingRate/2)/radius];
  state.encoder=measuredEncoders(state,motor,overrides.encoder_delay_steps??c.encoder_delay_steps,scenario);
  const requested=[];
  for(let i=0;i<2;i++){
    const error=targetOmega[i]-state.encoder[i],candidateIntegral=clamp(state.integral[i]+error*dt,-c.integral_limit,c.integral_limit);
    const ff=c.feedforward?targetOmega[i]/motor.no_load_omega:0,raw=ff+c.speed_kp*error+c.speed_ki*candidateIntegral;
    requested[i]=raw;state.duty[i]=clamp(raw,-1,1);if(Math.abs(raw)<=1)state.integral[i]=candidateIntegral;
  }
  const sourceV=overrides.source_voltage_v??scenario.source_voltage_v??e.source_voltage_v,limit=overrides.driver_current_limit_a??e.driver_current_limit_a,motorScale=overrides.motor_scale??1;
  let bus=Math.max(e.minimum_modeled_bus_v,state.bus_v||sourceV),current=[0,0];
  for(let n=0;n<config.numerics.bus_iterations;n++){
    for(let i=0;i<2;i++)current[i]=clamp(motor.stall_current*motorScale*(state.duty[i]*bus/sourceV-state.omega[i]/motor.no_load_omega),-limit,limit);
    const positive=current.reduce((s,x)=>s+Math.max(0,x),0);bus=Math.max(e.minimum_modeled_bus_v,sourceV-e.source_resistance_ohm*positive);
  }
  for(let i=0;i<2;i++)current[i]=clamp(motor.stall_current*motorScale*(state.duty[i]*bus/sourceV-state.omega[i]/motor.no_load_omega),-limit,limit);
  const torque=current.map(x=>x*motor.torque_constant),M=mass+2*Iw/(radius*radius),I=v.yaw_inertia_kg_m2+Iw*track*track/(2*radius*radius);
  const rolling=v.rolling_resistance_coefficient*mass*9.81*Math.tanh(state.v/.005),scrub=(overrides.caster_scrub_nm??v.caster_scrub_nm)*Math.tanh(state.yaw_rate/.02);
  let dv=((torque[0]+torque[1])/radius-rolling)/M,dw=(track*(torque[1]-torque[0])/(2*radius)-scrub)/I;
  const noSlipAlpha=[dv-track*dw/2,dv+track*dw/2],force=torque.map((t,i)=>t/radius-Iw*noSlipAlpha[i]/radius);
  const normal=v.driven_weight_fraction*mass*9.81/2,friction=[overrides.friction_left??scenario.friction_left??v.friction_coefficient,overrides.friction_right??scenario.friction_right??v.friction_coefficient];
  const cap=force.map((f,i)=>Math.sign(f)*Math.min(Math.abs(f),friction[i]*normal)),slipping=cap.some((f,i)=>Math.abs(f-force[i])>1e-9);
  if(slipping){
    dv=((cap[0]+cap[1])-rolling)/mass;dw=(track*(cap[1]-cap[0])/2-scrub)/v.yaw_inertia_kg_m2;
    for(let i=0;i<2;i++)state.omega[i]+=(torque[i]-cap[i]*radius)/Iw*dt;
  }else for(let i=0;i<2;i++)state.omega[i]+=noSlipAlpha[i]/radius*dt;
  state.v+=dv*dt;state.yaw_rate+=dw*dt;
  const nextYaw=state.yaw+state.yaw_rate*dt;state.x+=state.v*Math.cos((state.yaw+nextYaw)/2)*dt;state.y+=state.v*Math.sin((state.yaw+nextYaw)/2)*dt;state.yaw=wrap(nextYaw);
  for(let i=0;i<2;i++){state.wheel_angle[i]+=state.omega[i]*dt;state.current[i]=current[i];state.torque[i]=torque[i];state.slip[i]=state.omega[i]*radius-(state.v+(i?1:-1)*track*state.yaw_rate/2);state.saturated[i]=Math.abs(requested[i])>1||Math.abs(current[i])>=limit-1e-8;}
  state.bus_v=bus;state.energy_j+=bus*current.reduce((s,x)=>s+Math.max(0,x),0)*dt;state.t+=dt;
  state.history.push([...state.omega]);if(state.history.length>32)state.history.shift();return state;
}
function snapshot(state){return{t:round(state.t),x_m:round(state.x),y_m:round(state.y),yaw_rad:round(state.yaw),speed_m_s:round(state.v),yaw_rate_rad_s:round(state.yaw_rate),wheel_omega_rad_s:state.omega.map(x=>round(x)),wheel_angle_rad:state.wheel_angle.map(x=>round(x)),duty:state.duty.map(x=>round(x)),current_a:state.current.map(x=>round(x)),torque_nm:state.torque.map(x=>round(x)),bus_v:round(state.bus_v),energy_wh:round(state.energy_j/3600),slip_m_s:state.slip.map(x=>round(x)),saturated:[...state.saturated],encoder_rad_s:state.encoder.map(x=>round(x))};}
function simulate(input){
  validate(input.config);if(!Number.isFinite(input.mass)||input.mass<=0)throw new Error('positive scenario mass required');if(!input.scenario||!Number.isFinite(input.scenario.duration_s)||input.scenario.duration_s<=0)throw new Error('positive scenario duration required');const state=initialState(),scenario=input.scenario,steps=Math.round(scenario.duration_s/input.config.numerics.dt_s),sampleEvery=Math.round(input.config.numerics.sample_dt_s/input.config.numerics.dt_s),samples=[];
  if(!Number.isInteger(sampleEvery)||sampleEvery<1)throw new Error('sample_dt_s must be an integer multiple of dt_s');
  for(let n=0;n<=steps;n++){if(n%sampleEvery===0)samples.push(snapshot(state));if(n<steps)step(state,input,input.config.numerics.dt_s);}
  const steady=samples.filter(x=>x.t>=Math.min(2,scenario.duration_s/2)&&(scenario.stop_at_s===undefined||x.t<scenario.stop_at_s)),speedError=steady.map(x=>Math.abs(x.speed_m_s-command(scenario,x.t).speed));
  return{scenario_id:scenario.id,mass_kg:round(input.mass),samples,metrics:{duration_s:scenario.duration_s,distance_m:round(Math.hypot(state.x,state.y)),final_speed_m_s:round(state.v),final_yaw_rad:round(state.yaw),final_yaw_error_rad:round(scenario.id==='spin'?Math.abs(wrap(Math.PI-state.yaw)):Math.abs(wrap(state.yaw))),maximum_abs_current_a:round(Math.max(...samples.flatMap(x=>x.current_a.map(Math.abs)))),maximum_abs_slip_m_s:round(Math.max(...samples.flatMap(x=>x.slip_m_s.map(Math.abs)))),maximum_steady_speed_error_m_s:round(speedError.length?Math.max(...speedError):0),saturation_samples:samples.filter(x=>x.saturated.some(Boolean)).length,energy_wh:round(state.energy_j/3600)}};
}
function scenario(config,id){const s=config.scenarios.find(x=>x.id===id);if(!s)throw new Error(`unknown scenario ${id}`);return s;}
function parameters(config,data,selection,mass=config.vehicle.mass_kg,scenarioId='cruise',overrides={}){
  const candidate=data.order.candidates.find(x=>x.sku===String(selection.sku));if(!candidate)throw new Error('unknown motor');
  return{config,scenario:scenario(config,scenarioId),motor:motorModel(candidate),mass,overrides:{wheel_radius_m:Number(selection.wheel_diameter_mm)/2000,caster_scrub_nm:config.support_scrub_nm[selection.support_configuration],...overrides}};
}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function buildAnalysis(config,data){
  const cases=[];for(const row of data.matrix.configurations)for(const mass of config.sweep.mass_cases_kg)for(const s of config.scenarios){const selection={sku:row.sku,wheel_diameter_mm:row.wheel_diameter_mm,support_configuration:row.support_configuration},result=simulate(parameters(config,data,selection,mass,s.id));cases.push({configuration_id:row.id,sku:row.sku,wheel_diameter_mm:row.wheel_diameter_mm,support_configuration:row.support_configuration,mass_kg:mass,scenario_id:s.id,...result.metrics,nominal_geometry_review:Geometry.variant(data,selection).warnings});}
  const random=rng(config.sweep.ensemble_seed),ranges=config.sweep.ensemble_ranges,ensemble=[];
  for(let i=0;i<config.sweep.ensemble_runs;i++){const overrides={};for(const[key,[lo,hi]]of Object.entries(ranges))overrides[key]=key==='encoder_delay_steps'?Math.round(lerp(lo,hi,random())):lerp(lo,hi,random());const mass=overrides.mass_kg;delete overrides.mass_kg;const result=simulate(parameters(config,data,data.selected,mass,'cruise',overrides));ensemble.push({run:i,...overrides,mass_kg:round(mass),...result.metrics});}
  const quantile=(key,q)=>{const a=ensemble.map(x=>x[key]).sort((a,b)=>a-b),p=(a.length-1)*q,i=Math.floor(p);return round(lerp(a[i],a[i+1]??a[i],p-i));};
  return{version:config.version,status:config.status,case_count:cases.length,cases,ensemble:{seed:config.sweep.ensemble_seed,run_count:ensemble.length,distribution_status:'synthetic-deterministic-not-measured-probability',runs:ensemble,summary:{maximum_abs_current_a_p50:quantile('maximum_abs_current_a',.5),maximum_abs_current_a_p95:quantile('maximum_abs_current_a',.95),maximum_abs_slip_m_s_p95:quantile('maximum_abs_slip_m_s',.95),maximum_steady_speed_error_m_s_p95:quantile('maximum_steady_speed_error_m_s',.95)}}};
}
return{validate,motorModel,command,initialState,step,simulate,snapshot,scenario,parameters,buildAnalysis,rng,clamp,wrap,round};
});
