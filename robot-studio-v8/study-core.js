'use strict';

const MM = 0.001;
const IN = 0.0254;

function presentationFrame(c, index) {
  const frame = c.frames[index];
  if (!frame) throw new Error('Unknown mechanism sample');
  const reference = c.frames[0].tire_center_mm;
  return { frame, reference, offset: reference.map((v, i) => v - frame.tire_center_mm[i]) };
}

function shiftBox(b, offset) {
  return { min: b.min.map((v, i) => v + offset[i]), max: b.max.map((v, i) => v + offset[i]) };
}

function sampledPresentationBox(c) {
  const boxes = c.frames.map((_, i) => {
    const p = presentationFrame(c, i);
    return shiftBox(p.frame.assembly_box, p.offset);
  });
  return {
    min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]))),
  };
}

function tireVertices(data, c) {
  const source = data.mechanism.source_tire.mesh_envelope;
  const radial = c.tire.outer_radius_mm / source.enclosing_outer_radius_mm;
  const thickness = c.tire.thickness_mm / source.thickness_mm;
  const angle = c.yaw_deg * Math.PI / 180;
  const co = Math.cos(angle), si = Math.sin(angle), center = source.center_mm;
  return data.tireVertices.map((p) => {
    const x = (p[0] - center[0]) * radial;
    const y = (p[1] - center[1]) * thickness;
    const z = (p[2] - center[2]) * radial;
    const flat = [x, -z, y];
    const q = c.orientation === 'flat' ? flat : [flat[2], flat[1], -flat[0]];
    return [(q[0] * co - q[1] * si) * MM, (q[0] * si + q[1] * co) * MM, q[2] * MM];
  });
}

function studySummary(data) {
  return {
    stoppingRuns: data.stopping.runs.length,
    mechanismCases: data.mechanism.cases.length,
    mechanismFrames: data.mechanism.cases.reduce((n, c) => n + c.frames.length, 0),
    historicalTrackMm: data.stoppingConfig.vehicle.track_m * 1000,
    vendorTrackMm: data.assembly.assembly.lateral_stack_mm.track,
    physicalTrials: 0,
  };
}

module.exports = { MM, IN, presentationFrame, shiftBox, sampledPresentationBox, tireVertices, studySummary };
