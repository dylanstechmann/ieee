/* Detailed procedural hardware and routed wiring; no external models or dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RobotLabHardware = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = Math.PI*2, geometryCache = new Map();
  const add = (a,b) => a.map((v,i) => v+b[i]);
  const norm = a => { const n=Math.hypot(...a)||1; return a.map(v=>v/n); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const item = (mesh,pos,scale,material,extra={}) => ({mesh,pos,scale,material,rot:[0,0,0],...extra});
  function context(p, selectedPart) {
    const base = p.position || p.pos, selected = selectedPart === p.id, items = [];
    const make = (mesh,offset,scale,material,extra={}) => { const value=item(mesh,add(base,offset),scale,material,{id:p.id,selected,...extra}); items.push(value); return value; };
    return {p,make,items,
      box:(o,s,m,e)=>make('bevelBox',o,s,m,e),
      cyl:(o,s,m,e)=>make('cylinder',o,s,m,e),
      ring:(o,s,m,e)=>make('ring',o,s,m,e),
      sphere:(o,s,m,e)=>make('sphere',o,s,m,e)};
  }
  function screw(c, offset, radius=0.09) {
    c.cyl(offset,[radius*2,radius*2,0.07],'steel');
    c.box([offset[0],offset[1],offset[2]+0.04],[radius*1.25,0.025,0.012],'blackMetal');
  }
  function pcb(c, offset, size) {
    c.box(offset,[size[0],size[1],0.09],'pcb');
    for (const x of [-1,1]) for (const y of [-1,1]) screw(c,[offset[0]+x*(size[0]/2-0.14),offset[1]+y*(size[1]/2-0.14),offset[2]+0.08],0.055);
  }
  function chip(c, offset, size=[0.55,0.55,0.12]) {
    c.box(offset,size,'ic');
    c.box([offset[0],offset[1],offset[2]+size[2]/2+0.006],[size[0]*0.55,0.025,0.008],'silkscreen');
  }
  function header(c, offset, count=10, axis='x') {
    const size=axis==='x'?[count*0.1+0.08,0.22,0.16]:[0.22,count*0.1+0.08,0.16];
    c.box(offset,size,'blackPlastic');
    for(let i=0;i<count;i++) {
      const d=(i-(count-1)/2)*0.1, pos=[offset[0]+(axis==='x'?d:0),offset[1]+(axis==='y'?d:0),offset[2]+0.12];
      c.box(pos,[0.035,0.035,0.16],'gold');
    }
  }
  function capacitor(c, offset, radius=0.12, height=0.35) {
    c.cyl(offset,[radius*2,radius*2,height],'capacitor');
    c.cyl([offset[0],offset[1],offset[2]+height/2+0.006],[radius*1.75,radius*1.75,0.018],'aluminum');
    c.box([offset[0],offset[1],offset[2]+height/2+0.018],[radius*1.1,0.018,0.008],'blackMetal');
  }
  function catmull(points, samples=8) {
    const out=[];
    for(let i=0;i<points.length-1;i++) {
      const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
      for(let j=0;j<samples;j++) {
        const t=j/samples,t2=t*t,t3=t2*t;
        out.push([0,1,2].map(k=>0.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));
      }
    }
    out.push([...points[points.length-1]]); return out;
  }
  function tubeGeometry(wire) {
    if(geometryCache.has(wire.id)) return geometryCache.get(wire.id);
    const centers=catmull(wire.points,8),positions=[],normals=[],indices=[],sides=10,r=wire.diameter_in/2;
    for(let i=0;i<centers.length;i++) {
      const tangent=norm(centers[Math.min(i+1,centers.length-1)].map((v,k)=>v-centers[Math.max(0,i-1)][k]));
      const ref=Math.abs(tangent[2])<0.9?[0,0,1]:[0,1,0],n=norm(cross(tangent,ref)),b=norm(cross(tangent,n));
      for(let j=0;j<sides;j++) {
        const a=j/sides*TAU,radial=n.map((v,k)=>v*Math.cos(a)+b[k]*Math.sin(a));
        positions.push(...centers[i].map((v,k)=>v+radial[k]*r)); normals.push(...radial);
      }
    }
    for(let i=0;i<centers.length-1;i++) for(let j=0;j<sides;j++) {
      const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;
      indices.push(a,c,b,b,c,d);
    }
    const geometry={positions,normals,indices}; geometryCache.set(wire.id,geometry); return geometry;
  }

  function detailPart(p,options={}) {
    const c=context(p,options.selectedPart),s=options.state||{};
    switch(p.id) {
      case 'baseplate': {
        c.box([0,0,0],[9,8,0.24],'aluminum');
        for(const x of [-4.15,-2.8,0,2.8,4.15]) for(const y of [-3.65,3.65]) screw(c,[x,y,0.16]);
        for(const x of [-2.8,0,2.8]) c.box([x,0,0.128],[1.3,4.8,0.016],'blackMetal');
        break;
      }
      case 'rail-left': case 'rail-right': case 'cross-front': case 'cross-rear': {
        c.box([0,0,0],p.size,'aluminum');
        const alongX=p.size[0]>p.size[1];
        c.box([0,0,p.size[2]/2+0.008],alongX?[p.size[0]*0.8,0.11,0.018]:[0.11,p.size[1]*0.8,0.018],'blackMetal');
        const ends=alongX?[[-p.size[0]/2+0.25,0,p.size[2]/2+0.04],[p.size[0]/2-0.25,0,p.size[2]/2+0.04]]:[[0,-p.size[1]/2+0.25,p.size[2]/2+0.04],[0,p.size[1]/2-0.25,p.size[2]/2+0.04]];
        ends.forEach(o=>screw(c,o)); break;
      }
      case 'motor-left': case 'motor-right': {
        const sign=p.id.endsWith('left')?1:-1;
        c.cyl([0,-sign*0.35,0],[1.25,1.25,1.65],'motorSteel',{rot:[Math.PI/2,0,0]});
        c.cyl([0,-sign*1.15,0],[1.3,1.3,0.22],'blackMetal',{rot:[Math.PI/2,0,0]});
        c.cyl([0,sign*0.62,0],[1.4,1.4,0.58],'gearbox',{rot:[Math.PI/2,0,0]});
        c.cyl([0,sign*1.0,0],[0.24,0.24,0.55],'steel',{rot:[Math.PI/2,0,0]});
        c.box([0,0,-0.68],[1.65,1.8,0.12],'blackMetal');
        for(const x of [-0.55,0.55]) for(const y of [-0.55,0.55]) screw(c,[x,y,-0.59],0.07);
        c.box([0.35,-sign*1.18,0.35],[0.48,0.16,0.4],'pcb');
        for(let i=-3;i<=3;i++) c.box([i*0.16,-sign*0.35,0.63],[0.045,1.1,0.025],'blackMetal');
        break;
      }
      case 'wheel-left': case 'wheel-right': {
        const left=p.id.endsWith('left'),spin=(left?s.wheelLeft:s.wheelRight)||0;
        c.ring([0,0,0],[3,3,0.82],'rubber',{rot:[Math.PI/2,spin,0]});
        c.cyl([0,0,0],[1.55,1.55,0.86],'wheelHub',{rot:[Math.PI/2,spin,0]});
        c.cyl([0,left?0.45:-0.45,0],[0.48,0.48,0.12],'steel',{rot:[Math.PI/2,0,0]});
        for(let i=0;i<6;i++) {
          const a=i/6*TAU+spin,x=Math.cos(a)*0.57,z=Math.sin(a)*0.57;
          c.cyl([x,left?0.46:-0.46,z],[0.13,0.13,0.08],'steel',{rot:[Math.PI/2,0,0]});
        }
        for(const side of [-1,1]) c.ring([0,side*0.37,0],[2.72,2.72,0.055],'rubberSidewall',{rot:[Math.PI/2,0,0]});
        break;
      }
      case 'caster-front': case 'caster-rear': {
        c.sphere([0,0,-0.1],[0.75,0.75,0.75],'steel');
        c.box([0,0,0.32],[1.0,0.85,0.12],'blackMetal');
        for(const x of [-0.43,0.43]) c.box([x,0,0.02],[0.09,0.8,0.65],'zinc');
        screw(c,[0,0,0.42]); break;
      }
      case 'battery': {
        c.box([0,0,0],[3.2,1.8,1.35],'batteryWrap');
        for(const x of [-0.8,0,0.8]) c.box([x,0,0.68],[0.035,1.65,0.02],'batterySeam');
        c.box([0,0,0.69],[1.85,1.05,0.025],'batteryLabel');
        c.box([0,0.12,0.71],[1.35,0.09,0.012],'silkscreen');
        c.box([0,-0.12,0.71],[0.95,0.06,0.012],'silkscreen');
        c.box([1.1,-0.15,0.12],[0.5,0.8,0.55],'connectorYellow');
        for(const y of [-0.2,0.2]) c.box([1.36,y-0.15,0.12],[0.08,0.22,0.25],'gold');
        for(const x of [-1.25,1.25]) c.box([x,0,0.75],[0.18,2.0,0.08],'strap');
        break;
      }
      case 'power': {
        pcb(c,[0,0,0],[2.4,1.2]);
        for(let i=0;i<4;i++) {
          c.box([-0.78+i*0.5,-0.38,0.18],[0.38,0.32,0.28],'terminalBlue');
          screw(c,[-0.78+i*0.5,-0.38,0.35],0.06);
        }
        c.box([-0.1,0.25,0.24],[0.5,0.22,0.42],'fuseAmber');
        c.box([1.2,1.1,0.15],[1.0,0.65,0.12],'pcb');
        chip(c,[1.2,1.1,0.28],[0.42,0.35,0.15]);
        capacitor(c,[1.48,1.1,0.38],0.1,0.32);
        break;
      }
      case 'estop': {
        c.cyl([0,0,-0.18],[1.25,1.25,0.18],'estopYellow');
        c.cyl([0,0,0],[0.72,0.72,0.38],'blackPlastic');
        c.cyl([0,0,0.28],[1.0,1.0,0.38],'estopRed');
        c.cyl([0,0,0.49],[0.72,0.72,0.06],'estopRedTop');
        c.box([0,0,-0.07],[1.5,0.18,0.03],'blackPlastic');
        break;
      }
      case 'controller': {
        pcb(c,[0,0,0],[3.5,3]);
        chip(c,[0.25,0.25,0.15],[0.85,0.85,0.18]);
        c.box([-1.45,0.65,0.25],[0.65,1.25,0.48],'connectorMetal');
        for(const y of [-0.7,-0.05]) c.box([-1.55,y,0.2],[0.7,0.48,0.35],'connectorMetal');
        for(const y of [-0.7,-0.05]) c.box([-1.91,y,0.2],[0.025,0.3,0.18],'blackPlastic');
        header(c,[0.35,1.25,0.14],20,'x');
        c.box([1.45,0.25,0.16],[0.35,1.1,0.24],'connectorWhite');
        c.box([1.45,-0.9,0.13],[0.32,0.55,0.18],'connectorWhite');
        for(let i=0;i<6;i++) capacitor(c,[-0.7+i*0.25,-1.1,0.18],0.055,0.18);
        c.cyl([1.25,1.05,0.16],[0.15,0.15,0.08],'ledGreen');
        break;
      }
      case 'driver': {
        pcb(c,[0,0,0],[2.2,1.3]);
        c.box([0,0.12,0.2],[1.25,0.75,0.16],'blackMetal');
        for(let i=0;i<8;i++) c.box([-0.54+i*0.155,0.12,0.48],[0.055,0.8,0.55],'heatsink');
        capacitor(c,[-0.8,0.35,0.35],0.13,0.45); capacitor(c,[0.82,0.35,0.35],0.13,0.45);
        for(const x of [-0.75,-0.25,0.25,0.75]) {
          c.box([x,-0.48,0.17],[0.36,0.3,0.26],'terminalBlue'); screw(c,[x,-0.48,0.33],0.055);
        }
        chip(c,[0.65,-0.05,0.14],[0.35,0.35,0.12]); break;
      }
      case 'mast': {
        c.box([0,0,0],p.size,'aluminum');
        c.box([0,-0.18,0],[0.12,0.025,p.size[2]*0.86],'blackMetal');
        c.box([0,0,-p.size[2]/2+0.1],[1.1,1.1,0.16],'blackMetal');
        for(const x of [-0.4,0.4]) for(const y of [-0.4,0.4]) screw(c,[x,y,-p.size[2]/2+0.2]);
        break;
      }
      case 'camera': {
        c.box([0,0,0],[0.85,1.5,0.8],'cameraBody');
        c.box([-0.44,0,0],[0.08,1.35,0.68],'pcb');
        c.cyl([0.52,0,0],[0.62,0.62,0.5],'lensBarrel',{rot:[0,Math.PI/2,0]});
        c.cyl([0.79,0,0],[0.48,0.48,0.06],'lensGlass',{rot:[0,Math.PI/2,0]});
        c.cyl([0.83,0,0],[0.22,0.22,0.025],'lensCoating',{rot:[0,Math.PI/2,0]});
        for(const y of [-0.55,0.55]) screw(c,[0.44,y,0.25],0.055); break;
      }
      case 'range-front': case 'range-left': case 'range-right': {
        pcb(c,[0,0,0],p.size);
        const front=p.id==='range-front',rot=front?[0,Math.PI/2,0]:[Math.PI/2,0,0];
        for(const d of [-0.32,0.32]) {
          const o=front?[0.18,d,0.12]:[d,0,0.12];
          c.cyl(o,[0.36,0.36,0.18],'lensBarrel',{rot});
          const g=front?[0.28,d,0.12]:[d,front?0:0.1,0.12];
          c.cyl(g,[0.25,0.25,0.03],'lensGlass',{rot});
        }
        chip(c,[0,0,0.12],[0.28,0.25,0.1]); break;
      }
      case 'line-array': {
        pcb(c,[0,0,0],[0.5,4.5]);
        for(let i=0;i<8;i++) {
          const y=-1.85+i*0.53;
          c.box([0,y,0.1],[0.32,0.28,0.15],'ic');
          c.box([0.17,y,0.1],[0.035,0.12,0.08],'ledRed');
        }
        header(c,[0,2.0,0.13],5,'y'); break;
      }
      case 'fork-left': case 'fork-right': {
        c.box([0,0,0],p.size,'forkOrange');
        c.box([0.35,0,0.22],[1.1,0.3,0.12],'forkOrange');
        for(const x of [-0.75,0.65]) screw(c,[x,0,0.23],0.07);
        c.box([0.7,0,-0.2],[0.75,0.32,0.08],'rubberPad'); break;
      }
      case 'palm-left': case 'palm-right': {
        c.box([0,0,0],p.size,'forkOrange');
        c.box([0.18,0,0],[0.12,0.46,0.85],'rubberPad');
        for(const z of [-0.35,0.35]) c.cyl([0.22,0,z],[0.12,0.12,0.08],'steel',{rot:[0,Math.PI/2,0]}); break;
      }
      case 'carried-tire': {
        const blue=s.tire==='blue';
        c.ring([0,0,0],[2.684,2.684,1.087],blue?'tireBlue':'tireRed');
        for(const z of [-0.48,0.48]) c.ring([0,0,z],[2.56,2.56,0.07],blue?'tireBlue':'tireRed');
        break;
      }
      case 'flag-mast': {
        c.cyl([0,0,0],p.size,'steel');
        c.cyl([0,0,-2.25],[0.5,0.5,0.35],'blackMetal');
        c.cyl([0,0,2.48],[0.22,0.22,0.12],'gold'); break;
      }
      case 'flag': {
        c.box([0,0,0],p.size,'flagFabric');
        for(const y of [-1.05,1.05]) c.box([0,y,0],[0.12,0.12,1.42],'flagHem');
        c.box([0.055,0,0.25],[0.02,1.3,0.18],'silkscreen'); break;
      }
      case 'cable-cover': {
        c.cyl([0,0,0],[0.34,0.34,6],'conduit',{rot:[0,Math.PI/2,0]});
        for(let x=-2.8;x<=2.8;x+=0.28) c.cyl([x,0,0],[0.39,0.39,0.055],'conduitRib',{rot:[0,Math.PI/2,0]});
        break;
      }
      default: c.box([0,0,0],p.size,'plastic',{color:p.color});
    }
    return c.items;
  }

  function buildWires(wiring,options={}) {
    if(!options.showWiring) return [];
    const items=[],progress=options.progress===undefined?1:options.progress,lift=(1-progress)*9,state=options.state||{};
    for(const w of wiring.wires) {
      const current=options.Core?options.Core.netCurrent(w.net,state):0;
      items.push(item('custom',[0,0,lift],[1,1,1],w.kind==='ground'?'wireBlack':'wire',{
        id:w.id,wireId:w.id,geometry:tubeGeometry(w),color:w.color,activity:Math.min(1,Math.abs(current)/3),
        current,selected:options.selectedWire===w.id,roughness:0.46
      }));
    }
    for(const c of wiring.connectors) for(const [pin,pos] of Object.entries(c.pins)) {
      items.push(item('bevelBox',[pos[0],pos[1],pos[2]+lift],[0.11,0.11,0.11],'gold',{id:c.part,connector:`${c.id}.${pin}`}));
    }
    return items;
  }

  function buildRobot(parts,wiring,options={}) {
    const items=[];
    for(const p of parts) {
      const detail=detailPart(p,options);
      if(options.xray && ['baseplate','rail-left','rail-right','cross-front','cross-rear','cable-cover'].includes(p.id)) for(const o of detail) o.alpha=0.2;
      items.push(...detail);
    }
    const integration=parts.find(p=>p.id==='cable-cover');
    items.push(...buildWires(wiring,{...options,progress:integration?integration.progress:1}));
    return items;
  }

  function transformRobot(items,state) {
    const c=Math.cos(state.theta),s=Math.sin(state.theta);
    return items.map(o=>({...o,pos:[state.x+o.pos[0]*c-o.pos[1]*s,state.y+o.pos[0]*s+o.pos[1]*c,o.pos[2]],
      rot:[o.rot[0],o.rot[1],o.rot[2]+state.theta]}));
  }

  return {buildRobot,buildWires,transformRobot,tubeGeometry,catmull,detailPart};
});
