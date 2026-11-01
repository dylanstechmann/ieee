'use strict';
// Strict partition-crossing engineering audit: crossing a gate's infinite
// partition outside its finite span is a bypass, not earned progress.
// State retains last strict side AND whether travel on the partition stayed in
// span. No full-route history or floating contact coordinate enters state keys.
function createProgress(gates){
  if(!Array.isArray(gates)||!gates.length||gates.some(g=>![0,1].includes(g.axis)||![1,-1].includes(g.direction)||!Number.isFinite(g.value)||!Array.isArray(g.span)||g.span.length!==2||g.span.some(n=>!Number.isFinite(n))||g.span[0]>=g.span[1]))throw new Error('valid progress gates required');
  const side=(p,g)=>Math.abs(p[g.axis]-g.value)<1e-9?0:Math.sign(p[g.axis]-g.value);
  const inSpan=(p,g)=>p[1-g.axis]>=g.span[0]-1e-9&&p[1-g.axis]<=g.span[1]+1e-9;
  return {
    start:p=>({next:0,sides:gates.map(g=>side(p,g)),contact_ok:gates.map(g=>inSpan(p,g))}),
    accept:s=>s.next===gates.length,
    advance:(state,a,b)=>{
      const s=structuredClone(state),events=[];
      gates.forEach((g,i)=>{
        const from=s.sides[i],to=side(b,g),atA=side(a,g)===0;
        if(!to){s.contact_ok[i]=(atA?s.contact_ok[i]:true)&&inSpan(b,g);return;}
        if(from&&to!==from){
          const t=atA?0:(g.value-a[g.axis])/(b[g.axis]-a[g.axis]);
          const coordinate=atA?a[1-g.axis]:a[1-g.axis]+t*(b[1-g.axis]-a[1-g.axis]);
          events.push({index:i,direction:to,t,valid:coordinate>=g.span[0]-1e-9&&coordinate<=g.span[1]+1e-9&&(!atA||s.contact_ok[i])});
        }
        s.sides[i]=to;s.contact_ok[i]=true;
      });
      events.sort((a,b)=>a.t-b.t||a.index-b.index);
      for(const event of events){
        // Other finite gates may share a partition (upper/lower x=60).
        // Outside-span crossings matter only for the next required gate.
        if(!event.valid){if(event.index===s.next)return null;continue;}
        if(event.index!==s.next||event.direction!==gates[event.index].direction)return null;s.next++;
      }
      return s;
    }
  };
}
function auditProgress(points,gates){
  const p=createProgress(gates);let state=p.start(points[0]);
  for(let i=1;i<points.length;i++){const next=p.advance(state,points[i-1],points[i]);if(next===null)return {valid:false,failed_segment:i-1,state};state=next;}
  return {valid:p.accept(state),failed_segment:null,state};
}
module.exports={createProgress,auditProgress};