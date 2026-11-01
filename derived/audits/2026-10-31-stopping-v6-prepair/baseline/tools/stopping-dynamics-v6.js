(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.StoppingDynamics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sum=a=>a.reduce((s,x)=>s+x,0);
  function validate(c){
    if(c.status!=='synthetic-stopping-study-not-driver-or-hardware-qualification')throw new Error('explicit synthetic status required');
    const positive=x=>Number.isFinite(x)&&x>0;
    for(const x of[c.reference_voltage_v,...Object.values(c.numerics),c.vehicle.mass_kg,c.vehicle.yaw_inertia_kg_m2,c.vehicle.wheel_inertia_kg_m2,c.vehicle.wheel_radius_m,c.vehicle.track_m,c.electrical.source_voltage_v,c.electrical.synthetic_current_limit_a,...Object.values(c.stop)])if(!positive(x))throw new Error('positive finite model parameter required');
    for(const k of['sample_dt_s','control_dt_s'])if(Math.abs(c.numerics[k]/c.numerics.dt_s-Math.round(c.numerics[k]/c.numerics.dt_s))>1e-8)throw new Error('integer integration ratios required');
    for(const x of[c.electrical.source_resistance_ohm,c.vehicle.rolling_resistance_coefficient,c.vehicle.caster_scrub_nm,c.control.speed_kp,c.control.speed_ki,c.control.integral_limit])if(!Number.isFinite(x)||x<0)throw new Error('nonnegative finite model parameter required');
    if(!(c.vehicle.driven_weight_fraction>0&&c.vehicle.driven_weight_fraction<=1))throw new Error('invalid driven weight fraction');
    if(c.modes.join(',')!=='driven,coast,dynamic-brake,active-stop')throw new Error('four explicit modes required');
    if(!c.scenarios.length||new Set(c.scenarios.map(s=>s.id)).size!==c.scenarios.length)throw new Error('distinct scenarios required');
    for(const s of c.scenarios){if(!positive(s.duration_s)||![s.initial_speed_m_s,s.initial_yaw_rate_rad_s].every(Number.isFinite)||s.friction.length!==2||!s.friction.every(x=>Number.isFinite(x)&&x>=0))throw new Error('invalid scenario');for(const k of['source_voltage_v','synthetic_current_limit_a'])if(s[k]!==undefined&&!positive(s[k]))throw new Error('invalid scenario electrical override');if(s.drive_loss_at_s!==undefined&&!(s.drive_loss_at_s>=0&&s.drive_loss_at_s<s.duration_s))throw new Error('invalid loss time');}
    return true;
  }
  function motorModel(candidate,referenceVoltage=12){
    const stall=candidate.stall_current_a_extrapolated,torque=candidate.stall_torque_kgcm_extrapolated*0.0980665,omega=(candidate.no_load_rpm??candidate.no_load_rpm_12v)*Math.PI/30;
    if(![stall,torque,omega,referenceVoltage].every(x=>Number.isFinite(x)&&x>0))throw new Error('positive motor endpoints required');
    const resistance=referenceVoltage/stall,k=torque/stall,loss=(referenceVoltage-k*omega)*k/(resistance*omega);
    if(loss<0)throw new Error('endpoints require negative passive loss');
    return{sku:candidate.sku,reference_voltage_v:referenceVoltage,resistance_ohm:resistance,k_nm_a:k,k_v_s_rad:k,viscous_loss_nm_s_rad:loss,no_load_omega_rad_s:omega,archived_stall_torque_nm:torque,implied_no_load_current_a:(referenceVoltage-k*omega)/resistance,basis:'output-equivalent endpoint fit; NOT measured motor/gearbox parameters'};
  }
  function motorElectrical(m,omega,duty,bus,limit,mode){
    const emf=m.k_v_s_rad*omega;
    if(mode==='coast')return{current:0,voltage:emf,terminal_power:0,copper_loss:0,limited:false};
    const requested=mode==='dynamic-brake'?0:duty*bus,raw=(requested-emf)/m.resistance_ohm,current=mode==='dynamic-brake'?raw:clamp(raw,-limit,limit),voltage=mode==='dynamic-brake'?0:emf+current*m.resistance_ohm;
    return{current,voltage,terminal_power:voltage*current,copper_loss:current*current*m.resistance_ohm,limited:Math.abs(current-raw)>1e-12};
  }
  function electrical(m,omega,duty,source,resistance,limit,mode){
    // Solve Vbus = Vsource - Rsource * Pterminal/Vbus. Signed current permits
    // returned power into an explicitly unresolved ideal source boundary.
    function at(bus){const motors=omega.map((w,i)=>motorElectrical(m,w,duty[i],bus,limit,mode)),p=sum(motors.map(x=>x.terminal_power));return{motors,p,residual:bus-source+resistance*p/bus};}
    if(mode==='coast'||mode==='dynamic-brake'||resistance===0){const a=at(source);return{...a,bus_v:source,source_current_a:a.p/source};}
    let lo=source/2,hi=source*2,a=at(lo),b=at(hi);
    if(a.residual>0||b.residual<0)throw new Error('source operating point outside supported high-voltage branch');
    for(let n=0;n<48;n++){const mid=(lo+hi)/2;if(at(mid).residual>0)hi=mid;else lo=mid;}
    const bus=(lo+hi)/2,result=at(bus);return{...result,bus_v:bus,source_current_a:result.p/bus};
  }
  const kinetic=(s,v)=>.5*v.mass_kg*s.v*s.v+.5*v.yaw_inertia_kg_m2*s.yaw_rate*s.yaw_rate+.5*v.wheel_inertia_kg_m2*sum(s.omega.map(w=>w*w));
  function simulate(config,motor,scenarioId,mode){
    validate(config);if(!config.modes.includes(mode))throw new Error('unknown output mode');
    const scenario=config.scenarios.find(x=>x.id===scenarioId);if(!scenario)throw new Error('unknown scenario');
    const v=config.vehicle,n=config.numerics,dt=n.dt_s,r=v.wheel_radius_m,track=v.track_m,Iw=v.wheel_inertia_kg_m2,source=scenario.source_voltage_v??config.electrical.source_voltage_v,limit=scenario.synthetic_current_limit_a??config.electrical.synthetic_current_limit_a;
    const s={t:0,x:0,y:0,yaw:0,v:scenario.initial_speed_m_s,yaw_rate:scenario.initial_yaw_rate_rad_s,omega:[-1,1].map(side=>(scenario.initial_speed_m_s+side*track*scenario.initial_yaw_rate_rad_s/2)/r),wheel_angle:[0,0],integral:[0,0],duty:[0,0]};
    const initialK=kinetic(s,v),energy={source_net_j:0,source_drawn_j:0,returned_boundary_j:0,source_resistor_j:0,copper_j:0,equivalent_viscous_j:0,rolling_scrub_j:0,slip_j:0},samples=[],controlEvery=Math.round(n.control_dt_s/dt),sampleEvery=Math.round(n.sample_dt_s/dt),steps=Math.round(scenario.duration_s/dt);
    if(Math.abs(steps*dt-scenario.duration_s)>1e-9)throw new Error('duration must align to integration step');
    let distance=0,peakCurrent=0,peakSlip=0,peakBus=source,limitedSteps=0,stoppedSince=null,stopTime=null,stopDistance=null,maxBalance=0,last={current_a:[0,0],torque_nm:[0,0],bus_v:source,source_current_a:0,output_mode:mode,slip_m_s:[0,0],terminal_power_w:0};
    const snapshot=()=>({t:s.t,x_m:s.x,y_m:s.y,yaw_rad:s.yaw,speed_m_s:s.v,yaw_rate_rad_s:s.yaw_rate,wheel_omega_rad_s:[...s.omega],wheel_angle_rad:[...s.wheel_angle],duty:[...s.duty],...last,energy:{...energy},energy_balance_residual_j:energy.source_net_j-(kinetic(s,v)-initialK+energy.source_resistor_j+energy.copper_j+energy.equivalent_viscous_j+energy.rolling_scrub_j+energy.slip_j)});
    for(let step=0;step<=steps;step++){
      const stopped=Math.abs(s.v)<=config.stop.speed_threshold_m_s&&Math.abs(s.yaw_rate)<=config.stop.yaw_rate_threshold_rad_s&&s.omega.every(w=>Math.abs(w)<=config.stop.wheel_speed_threshold_rad_s);
      if(stopped){if(stoppedSince===null)stoppedSince={time:s.t,distance};if(stopTime===null&&s.t-stoppedSince.time>=config.stop.dwell_s-1e-10){stopTime=stoppedSince.time;stopDistance=stoppedSince.distance;}}else stoppedSince=null;
      if(step%sampleEvery===0||step===steps)samples.push(snapshot());if(step===steps)break;
      const outputMode=scenario.drive_loss_at_s!==undefined&&s.t>=scenario.drive_loss_at_s-1e-10?'coast':mode;
      if(step%controlEvery===0){for(let i=0;i<2;i++){
        const target=mode==='driven'?(scenario.initial_speed_m_s+(i?1:-1)*track*scenario.initial_yaw_rate_rad_s/2)/r:0,error=target-s.omega[i],integral=clamp(s.integral[i]+error*n.control_dt_s,-config.control.integral_limit,config.control.integral_limit),raw=target*motor.k_v_s_rad/source+config.control.speed_kp*error+config.control.speed_ki*integral;
        s.duty[i]=outputMode==='coast'||outputMode==='dynamic-brake'?0:clamp(raw,-1,1);if(Math.abs(raw)<=1)s.integral[i]=integral;
      }}
      const e=electrical(motor,s.omega,s.duty,source,config.electrical.source_resistance_ohm,limit,outputMode),current=e.motors.map(m=>m.current),electromagnetic=current.map(x=>motor.k_nm_a*x),loss=s.omega.map(w=>motor.viscous_loss_nm_s_rad*w),torque=electromagnetic.map((t,i)=>t-loss[i]);
      const rolling=v.rolling_resistance_coefficient*v.mass_kg*9.81*Math.tanh(s.v/.005),scrub=v.caster_scrub_nm*Math.tanh(s.yaw_rate/.02);
      const slip=s.omega.map((w,i)=>w*r-s.v-(i?1:-1)*track*s.yaw_rate/2),oldV=s.v,oldYawRate=s.yaw_rate,oldOmega=[...s.omega];
      // External torques first, followed by a two-contact maximum-dissipation
      // impulse projection. Box constraints are Coulomb friction budgets.
      s.v-=rolling/v.mass_kg*dt;s.yaw_rate-=scrub/v.yaw_inertia_kg_m2*dt;
      s.omega=s.omega.map((w,i)=>w+torque[i]/Iw*dt);
      const beforeContact=kinetic(s,v),h=track/2,diag=r*r/Iw+1/v.mass_kg+h*h/v.yaw_inertia_kg_m2,off=1/v.mass_kg-h*h/v.yaw_inertia_kg_m2;
      const freeSlip=s.omega.map((w,i)=>w*r-s.v-(i?1:-1)*h*s.yaw_rate),impulse=[0,0],budgets=scenario.friction.map(mu=>mu*v.driven_weight_fraction*v.mass_kg*9.81/2*dt);
      for(let iteration=0;iteration<24;iteration++)for(let i=0;i<2;i++)impulse[i]=clamp((freeSlip[i]-off*impulse[1-i])/diag,-budgets[i],budgets[i]);
      s.v+=sum(impulse)/v.mass_kg;s.yaw_rate+=h*(impulse[1]-impulse[0])/v.yaw_inertia_kg_m2;s.omega=s.omega.map((w,i)=>w-r*impulse[i]/Iw);
      const contactDissipation=Math.max(0,beforeContact-kinetic(s,v));
      energy.source_net_j+=source*e.source_current_a*dt;energy.source_drawn_j+=Math.max(0,source*e.source_current_a)*dt;energy.returned_boundary_j+=Math.max(0,-source*e.source_current_a)*dt;energy.source_resistor_j+=e.source_current_a**2*config.electrical.source_resistance_ohm*dt;energy.copper_j+=sum(e.motors.map(m=>m.copper_loss))*dt;energy.equivalent_viscous_j+=sum(loss.map((t,i)=>t*oldOmega[i]))*dt;energy.rolling_scrub_j+=(rolling*oldV+scrub*oldYawRate)*dt;energy.slip_j+=contactDissipation;
      peakCurrent=Math.max(peakCurrent,...current.map(Math.abs));peakSlip=Math.max(peakSlip,...slip.map(Math.abs));peakBus=Math.max(peakBus,e.bus_v);if(e.motors.some(m=>m.limited))limitedSteps++;
      distance+=Math.abs((oldV+s.v)/2)*dt;s.yaw+=s.yaw_rate*dt;s.x+=(oldV+s.v)/2*Math.cos(s.yaw)*dt;s.y+=(oldV+s.v)/2*Math.sin(s.yaw)*dt;s.wheel_angle=s.wheel_angle.map((w,i)=>w+s.omega[i]*dt);s.t=(step+1)*dt;
      last={current_a:current,torque_nm:torque,bus_v:e.bus_v,source_current_a:e.source_current_a,output_mode:outputMode,slip_m_s:slip,terminal_power_w:e.p};maxBalance=Math.max(maxBalance,Math.abs(snapshot().energy_balance_residual_j));
    }
    return{scenario_id:scenarioId,mode,motor_sku:motor.sku,samples,metrics:{stop_status:stopTime===null?'did-not-stop-within-horizon':'threshold-and-dwell-met-not-a-safety-stop',stop_time_s:stopTime,stop_distance_m:stopDistance,path_distance_m:distance,residual_yaw_rad:s.yaw,final_speed_m_s:s.v,final_wheel_omega_rad_s:[...s.omega],final_yaw_rate_rad_s:s.yaw_rate,maximum_abs_current_a:peakCurrent,maximum_abs_slip_m_s:peakSlip,maximum_ideal_bus_v:peakBus,current_limited_integration_steps:limitedSteps,initial_kinetic_j:initialK,final_kinetic_j:kinetic(s,v),maximum_abs_energy_balance_residual_j:maxBalance,final_energy_balance_residual_j:snapshot().energy_balance_residual_j,...energy}};
  }
  return{validate,motorModel,motorElectrical,electrical,kinetic,simulate};
});