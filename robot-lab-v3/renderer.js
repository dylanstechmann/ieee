/* Minimal WebGL renderer: no libraries, network requests or hidden simulation. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, s) => a.map(v => v * s);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => mul(a, 1 / Math.hypot(...a));
  function multiply(a, b) {
    const out = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return out;
  }
  const translation = p => [1,0,0,0,0,1,0,0,0,0,1,0,p[0],p[1],p[2],1];
  const scaling = s => [s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,0,0,0,1];
  const rotationX = a => [1,0,0,0,0,Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1];
  const rotationY = a => [Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1];
  const rotationZ = a => [Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1,0,0,0,0,1];
  function modelMatrix(o) {
    const r = o.rot || [0, 0, 0];
    let m = translation(o.pos);
    m = multiply(m, rotationZ(r[2] || 0)); m = multiply(m, rotationY(r[1] || 0)); m = multiply(m, rotationX(r[0] || 0));
    return multiply(m, scaling(o.scale));
  }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect,0,0,0,0,f,0,0,0,0,(far + near) * nf,-1,0,0,2 * far * near * nf,0];
  }
  function lookAt(eye, target) {
    const z = norm(sub(eye, target)), x = norm(cross([0, 0, 1], z)), y = cross(z, x);
    return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x, eye),-dot(y, eye),-dot(z, eye),1];
  }
  function cameraMatrix(camera, aspect) {
    const cp = Math.cos(camera.pitch), eye = add(camera.target, [
      camera.distance * cp * Math.cos(camera.yaw), camera.distance * cp * Math.sin(camera.yaw), camera.distance * Math.sin(camera.pitch)]);
    return multiply(perspective(Math.PI / 4, aspect, 0.1, 500), lookAt(eye, camera.target));
  }
  function color(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function cube() {
    const p = [], n = [], idx = [];
    const faces = [
      [[1,0,0], [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],
      [[-1,0,0], [[-.5,.5,-.5],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5]]],
      [[0,1,0], [[.5,.5,-.5],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5]]],
      [[0,-1,0], [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]],
      [[0,0,1], [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],
      [[0,0,-1], [[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5],[-.5,-.5,-.5]]]
    ];
    for (const [normal, verts] of faces) {
      const base = p.length / 3;
      for (const v of verts) { p.push(...v); n.push(...normal); }
      idx.push(base,base+1,base+2,base,base+2,base+3);
    }
    return {positions:p, normals:n, indices:idx};
  }
  function cylinder(segments = 28) {
    const p = [], n = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU, x = Math.cos(a), y = Math.sin(a);
      p.push(x,y,-.5, x,y,.5); n.push(x,y,0, x,y,0);
    }
    for (let i = 0; i < segments; i++) { const a = i * 2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
    for (const z of [-.5, .5]) {
      const center = p.length / 3; p.push(0,0,z); n.push(0,0,Math.sign(z));
      for (let i = 0; i <= segments; i++) { const a = i / segments * TAU; p.push(Math.cos(a),Math.sin(a),z); n.push(0,0,Math.sign(z)); }
      for (let i = 0; i < segments; i++) idx.push(center,center+i+1,center+i+2);
    }
    return {positions:p, normals:n, indices:idx};
  }
  function torus(major = 32, minor = 12) {
    const p = [], n = [], idx = [], tube = 0.2568;
    for (let i = 0; i <= major; i++) for (let j = 0; j <= minor; j++) {
      const u = i / major * TAU, v = j / minor * TAU, ring = 1 + tube * Math.cos(v);
      p.push(ring * Math.cos(u),ring * Math.sin(u),tube * Math.sin(v));
      n.push(Math.cos(v) * Math.cos(u),Math.cos(v) * Math.sin(u),Math.sin(v));
    }
    for (let i = 0; i < major; i++) for (let j = 0; j < minor; j++) {
      const a = i * (minor + 1) + j, b = a + minor + 1; idx.push(a,b,a+1,b,b+1,a+1);
    }
    return {positions:p, normals:n, indices:idx};
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', {antialias:true, alpha:false});
    if (!gl) throw new Error('WebGL is unavailable. Enable browser graphics acceleration to use the 3D lab.');
    const vertex = `
      attribute vec3 aPosition; attribute vec3 aNormal;
      uniform mat4 uModel, uViewProjection; uniform vec3 uScale;
      varying vec3 vNormal; varying vec3 vWorld;
      void main(){ vec4 world=uModel*vec4(aPosition,1.0); vWorld=world.xyz;
        vNormal=normalize(mat3(uModel)*(aNormal/(uScale*uScale)));
        gl_Position=uViewProjection*world; }`;
    const fragment = `
      precision mediump float; uniform vec3 uColor; uniform float uSelected;
      varying vec3 vNormal; varying vec3 vWorld;
      void main(){ vec3 normal=normalize(vNormal); vec3 light=normalize(vec3(-0.45,-0.35,0.9));
        float diffuse=max(dot(normal,light),0.0); float rim=pow(1.0-abs(normal.z),3.0)*0.08;
        vec3 c=uColor*(0.38+0.62*diffuse)+rim;
        c=mix(c,vec3(0.84,0.95,0.29),uSelected*0.48); gl_FragColor=vec4(c,1.0); }`;
    function shader(type, source) {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const loc = {
      position:gl.getAttribLocation(program, 'aPosition'), normal:gl.getAttribLocation(program, 'aNormal'),
      model:gl.getUniformLocation(program, 'uModel'), vp:gl.getUniformLocation(program, 'uViewProjection'),
      scale:gl.getUniformLocation(program, 'uScale'), color:gl.getUniformLocation(program, 'uColor'), selected:gl.getUniformLocation(program, 'uSelected')
    };
    function upload(mesh) {
      const result = {count:mesh.indices.length};
      for (const [key, values, attribute] of [['position',mesh.positions,loc.position],['normal',mesh.normals,loc.normal]]) {
        const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
        result[key] = {buffer, attribute};
      }
      result.index = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
      return result;
    }
    const meshes = {box:upload(cube()), cylinder:upload(cylinder()), torus:upload(torus())};
    let latestVP = null;
    function resize() {
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1), w = Math.max(1, Math.round(canvas.clientWidth * ratio)), h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      return canvas.width / canvas.height;
    }
    function render(instances, camera) {
      const aspect = resize(); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.035, 0.055, 0.085, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.useProgram(program);
      latestVP = cameraMatrix(camera, aspect); gl.uniformMatrix4fv(loc.vp, false, new Float32Array(latestVP));
      for (const o of instances) {
        const mesh = meshes[o.mesh || 'box']; if (!mesh) continue;
        for (const key of ['position','normal']) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh[key].buffer); gl.enableVertexAttribArray(mesh[key].attribute); gl.vertexAttribPointer(mesh[key].attribute, 3, gl.FLOAT, false, 0, 0); }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
        gl.uniformMatrix4fv(loc.model, false, new Float32Array(modelMatrix(o)));
        gl.uniform3fv(loc.scale, o.scale); gl.uniform3fv(loc.color, color(o.color || '#ffffff')); gl.uniform1f(loc.selected, o.selected ? 1 : 0);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      }
    }
    function project(point) {
      if (!latestVP) return null;
      const m = latestVP, x = m[0]*point[0]+m[4]*point[1]+m[8]*point[2]+m[12], y = m[1]*point[0]+m[5]*point[1]+m[9]*point[2]+m[13], w = m[3]*point[0]+m[7]*point[1]+m[11]*point[2]+m[15];
      if (w <= 0) return null;
      return {x:(x / w * 0.5 + 0.5) * canvas.clientWidth, y:(0.5 - y / w * 0.5) * canvas.clientHeight};
    }
    return {render, project, resize};
  }
  root.RobotLabRenderer = {createRenderer, multiply, modelMatrix, cameraMatrix};
})(typeof globalThis !== 'undefined' ? globalThis : this);
