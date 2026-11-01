/* Offline parametric Order A mule geometry; nominal visualization, not fabrication CAD. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../robot-lab-v4/hardware'):root.RobotLabHardware);if(typeof module==='object'&&module.exports)module.exports=api;root.MuleStudioCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Hardware){
  'use strict';
  const IN=1/25.4,round=(n,p=6)=>Number(n.toFixed(p));
  function validateData(data){if(!data||data.status!=='selected-mule-studio-not-ordered-not-hardware-validated')throw new Error('explicit mule studio status required');if(!data.matrix||data.matrix.configurations.length!==18)throw new Error('18 configurations required');if(!data.order||data.order.totals.priced_order_a_subtotal_usd!==177.25)throw new Error('linked Order A total required');return true;}
  function motor(data,sku){const m=data.order.candidates.find(x=>x.sku===String(sku));if(!m)throw new Error(`unknown motor ${sku}`);return m;}
  function variant(data,selection){
    validateData(data);const m=motor(data,selection.sku),wheel=Number(selection.wheel_diameter_mm),support=selection.support_configuration;
    const row=data.matrix.configurations.find(x=>x.sku===m.sku&&x.wheel_diameter_mm===wheel&&x.support_configuration===support);if(!row)throw new Error('unknown configuration');const c=data.config,d=c.drive,r=wheel/2,length=m.id==='M100'?72.5:70;
    const deck_top=r-c.bracket.shaft_center_above_mount_face_mm,deck_bottom=deck_top-c.deck.thickness_mm,caster_contact=deck_bottom-(c.caster.body_height_mm+c.caster.selected_spacer_mm),motor_gap=2*(d.gearbox_face_y_mm-length),clearance=d.wheel_center_y_mm-d.wheel_width_mm/2-c.deck.width_mm/2;
    const warnings=[];if(Math.abs(caster_contact)>c.gates.caster_contact_tolerance_mm)warnings.push(`Caster contact ${round(caster_contact,3)} mm exceeds ±${c.gates.caster_contact_tolerance_mm} mm; change spacer/deck geometry.`);if(motor_gap<c.gates.minimum_motor_body_gap_mm)warnings.push(`Motor-body gap ${motor_gap} mm is below ${c.gates.minimum_motor_body_gap_mm} mm; move gearbox faces outward or revise deck.`);if(clearance<c.gates.minimum_wheel_deck_lateral_clearance_mm)warnings.push('Wheel/deck lateral clearance failed.');if(!row.arithmetic_screen_pass)warnings.push('Arithmetic motor/wheel gate failed.');
    return{row,motor:m,wheel_diameter_mm:wheel,support_configuration:support,geometry:{wheel_radius_mm:r,motor_body_length_mm:length,deck_top_z_mm:round(deck_top),deck_bottom_z_mm:round(deck_bottom),caster_contact_z_mm:round(caster_contact),motor_body_center_gap_mm:round(motor_gap),wheel_deck_lateral_clearance_mm:round(clearance),wheel_track_mm:2*d.wheel_center_y_mm,overall_drive_width_mm:2*(d.wheel_center_y_mm+d.wheel_width_mm/2),overall_height_mm:wheel},warnings,status:warnings.length?'review-required':'nominal-digital-checks-pass'};
  }
  function buildItems(data,selection,options={}){
    const v=variant(data,selection),c=data.config,d=c.drive,g=v.geometry,ex=Number(options.exploded)||0,items=[];
    const item=(mesh,pos,scale,material,color,rot=[0,0,0],extra={})=>{const o={mesh,pos:pos.map(x=>x*IN),scale:scale.map(x=>x*IN),material,color,rot,...extra};items.push(o);return o;};
    const deckColor=options.xray?'#425466':'#49677d';item('bevelBox',[0,0,(g.deck_top_z_mm+g.deck_bottom_z_mm)/2],[c.deck.length_mm,c.deck.width_mm,c.deck.thickness_mm],'plastic',deckColor,[0,0,0],options.xray?{alpha:.22}:{});
    for(const side of[-1,1]){
      const motorY=side*(d.gearbox_face_y_mm-g.motor_body_length_mm/2+ex*18),faceY=side*(d.gearbox_face_y_mm+ex*18),wheelY=side*(d.wheel_center_y_mm+ex*42),z=g.wheel_radius_mm;
      item('cylinder',[0,motorY,z],[c.drive.motor_body_diameter_mm,c.drive.motor_body_diameter_mm,g.motor_body_length_mm],'aluminum','#9ba9b5',[Math.PI/2,0,0],{id:`motor-${side}`});
      item('cylinder',[0,side*(d.gearbox_face_y_mm-5+ex*18),z],[37,37,10],'blackMetal','#566570',[Math.PI/2,0,0],{id:`gearbox-${side}`});
      item('cylinder',[0,side*(d.gearbox_face_y_mm+8+ex*18),z],[6,6,16],'steel','#ccd5dc',[Math.PI/2,0,0]);
      item('bevelBox',[0,faceY,z],[36.8,2.9,36.8],'aluminum','#bbc5ce',[0,0,0],{id:`bracket-${side}`});
      item('bevelBox',[0,faceY-side*3.25,g.deck_top_z_mm+3.25],[36.8,6.5,6.5],'aluminum','#bbc5ce');
      item('cylinder',[0,wheelY,z],[v.wheel_diameter_mm,v.wheel_diameter_mm,c.drive.wheel_width_mm],'rubber','#20252a',[Math.PI/2,0,0],{id:`wheel-${side}`});
      item('cylinder',[0,wheelY-side*5.2,z],[28,28,1.8],'plastic','#303a43',[Math.PI/2,0,0]);
      item('cylinder',[0,wheelY,z],[17,17,12],'aluminum','#bcc7cf',[Math.PI/2,0,0],{id:`hub-${side}`});
      for(const x of[-14.8,0,14.8])item('cylinder',[x,faceY-side*2,g.deck_top_z_mm+1],[5,2,5],'steel','#d9e0e5');
    }
    item('bevelBox',[-45,0,g.deck_top_z_mm+4],[20,20,8],'blackPlastic','#202a33',[0,0,0],{id:'encoder-termination-proxy'});
    const active=selection.support_configuration==='dual-front-rear'?c.caster.positions_x_mm:selection.support_configuration==='front-only'?[75]:[-75];
    for(const x of active){const xx=x+Math.sign(x)*ex*25;item('sphere',[xx,0,g.caster_contact_z_mm+c.caster.ball_diameter_mm/2],[12.7,12.7,12.7],'steel','#9da9b2',[0,0,0],{id:`caster-${x}`});item('bevelBox',[xx,0,g.deck_bottom_z_mm-4],[20.3,15.2,8],'plastic','#303941');item('bevelBox',[xx,0,g.deck_top_z_mm+1],[24,20,2],'blackMetal','#9b7a2e');for(const dx of[-7.35,7.35])item('cylinder',[xx+dx,0,g.deck_top_z_mm+2.5],[4,4,2],'steel','#e5c14f');}
    if(options.showWiring!==false&&ex<.05)items.push(...wires(data,g));
    return{items,variant:v};
  }
  function wires(data,g){
    const colors={red:'#e45d5d',black:'#20242a',green:'#4dbb72',blue:'#4591df',yellow:'#e5c14f',white:'#e8edf0'},items=[];
    for(const side of[-1,1]){let index=0;for(const[name,color]of Object.entries(colors)){const start=[-12*IN,side*4*IN,(g.wheel_radius_mm+18)*IN],end=[-45*IN,(index-2.5)*3*IN,(g.deck_top_z_mm+9)*IN],mid=[(-25-index*2)*IN,side*(12+index*2)*IN,(g.deck_top_z_mm+40+index)*IN];const w={id:`encoder-${side}-${name}`,diameter_in:.035,points:[start,mid,end]};items.push({mesh:'custom',pos:[0,0,0],scale:[1,1,1],material:'wire',color,rot:[0,0,0],geometry:Hardware.tubeGeometry(w),id:w.id,wireId:w.id});index++;}}
    return items;
  }
  return{validateData,variant,buildItems,wires};
});
