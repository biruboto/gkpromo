const CRT_STRENGTHS = { soft: .58, strong: 1 };
export const CRT_CONTROL_IDS = { curve: 'crtCurve', rgb: 'crtRgb', scanline: 'crtScanline', mask: 'crtMask', vignette: 'crtVignette', drift: 'crtDrift', bloom: 'crtBloom', glow: 'crtGlow' };
export const CRT_LOOKS = {
  arcade: { treatment: 'strong', controls: { curve: '130', rgb: '50', scanline: '40', mask: '50', vignette: '120', drift: '7', bloom: '120', glow: '170' } },
  broadcast: { treatment: 'soft', controls: { curve: '10', rgb: '20', scanline: '30', mask: '45', vignette: '100', drift: '0', bloom: '65', glow: '65' } },
  tube: { treatment: 'strong', controls: { curve: '88', rgb: '30', scanline: '58', mask: '45', vignette: '100', drift: '0', bloom: '135', glow: '180' } },
  chroma: { treatment: 'soft', controls: { curve: '35', rgb: '88', scanline: '44', mask: '45', vignette: '100', drift: '0', bloom: '85', glow: '95' } }
};
const CRT_VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aPosition * .5 + .5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
const CRT_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uSource;
  uniform vec2 uSourceSize;
  uniform vec2 uOutputSize;
  uniform float uStrength;
  uniform float uCurve;
  uniform float uSeparation;
  uniform float uScanlines;
  uniform float uMask;
  uniform float uVignette;
  uniform float uDrift;
  uniform float uBloom;
  uniform float uGlow;
  uniform float uTime;

  vec3 sampleFrame(vec2 coordinate) {
    return texture2D(uSource, clamp(coordinate, 0.0, 1.0)).rgb;
  }

  vec3 brightFrame(vec2 coordinate) {
    return max(pow(sampleFrame(coordinate), vec3(2.15)) - vec3(.035), vec3(0.0));
  }

  void main() {
    float outputAspect = uOutputSize.x / uOutputSize.y;
    vec2 screen = (vTexCoord - .5) * 2.0;
    vec2 geometry = vec2(screen.x * outputAspect, screen.y);
    float radius = dot(geometry, geometry);
    vec2 warped = geometry * (1.0 + vec2(.024, .036) * uStrength * uCurve * radius);
    warped *= 1.0 - .018 * uStrength * uCurve;
    vec2 sourceCoord = vec2(warped.x / outputAspect, warped.y) * .5 + .5;
    float edge = 1.0 - smoothstep(.97, 1.05, max(abs(warped.x / outputAspect), abs(warped.y)));
    vec2 texel = 1.0 / uSourceSize;
    sourceCoord.x += sin(sourceCoord.y * 190.0 + uTime * 5.0) * texel.x * 2.0 * uStrength * uDrift;
    vec3 center = sampleFrame(sourceCoord);
    vec3 horizontal = (sampleFrame(sourceCoord - vec2(texel.x, 0.0)) + center * 2.0 + sampleFrame(sourceCoord + vec2(texel.x, 0.0))) * .25;
    vec3 bloom = (brightFrame(sourceCoord - vec2(texel.x, 0.0)) + brightFrame(sourceCoord + vec2(texel.x, 0.0)) + brightFrame(sourceCoord - vec2(0.0, texel.y)) + brightFrame(sourceCoord + vec2(0.0, texel.y))) * .25;
    vec3 glow = (brightFrame(sourceCoord - vec2(texel.x * 3.0, 0.0)) + brightFrame(sourceCoord + vec2(texel.x * 3.0, 0.0))) * .09;
    glow += (brightFrame(sourceCoord - vec2(0.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(0.0, texel.y * 2.0))) * .12;
    glow += (brightFrame(sourceCoord + vec2(texel.x * 2.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(-texel.x * 2.0, texel.y * 2.0)) + brightFrame(sourceCoord + vec2(texel.x * 2.0, -texel.y * 2.0)) + brightFrame(sourceCoord - vec2(texel.x * 2.0, texel.y * 2.0))) * .05;
    vec2 separation = vec2(texel.x * uSeparation * 2.5, 0.0);
    vec3 separated = vec3(sampleFrame(sourceCoord - separation).r, horizontal.g, sampleFrame(sourceCoord + separation).b);
    vec3 color = mix(horizontal, separated, uSeparation);
    color = pow(max(color, vec3(0.0)), vec3(2.15));
    color += bloom * .28 * uStrength * uBloom;
    color += glow * .7 * uStrength * uGlow;
    float scanlineBand = mod(floor(sourceCoord.y * uSourceSize.y), 2.0);
    float beam = mix(1.0 - .78 * uStrength * uScanlines, 1.0, scanlineBand);
    beam = mix(beam, min(1.08, beam + .14), smoothstep(.08, .65, dot(color, vec3(.299, .587, .114))) * uStrength * uGlow);
    float triad = mod(floor(gl_FragCoord.x), 3.0);
    vec3 mask = vec3(.72);
    if (triad < 1.0) mask.r = 1.0;
    else if (triad < 2.0) mask.g = 1.0;
    else mask.b = 1.0;
    mask = mix(vec3(1.0), mask, uMask * uStrength);
    float vignette = 1.0 - .16 * uStrength * uCurve * uVignette * smoothstep(.2, 1.55, radius);
    float signalRoll = 1.0 + sin(sourceCoord.y * 14.0 - uTime * 2.0) * .035 * uStrength * uDrift;
    color *= beam * mask * vignette * signalRoll * edge;
    color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`;
export function createCrtPipeline({ sourceCanvas, outputCanvas, sourceWidth: initialSourceWidth, sourceHeight: initialSourceHeight, outputWidth: initialOutputWidth, outputHeight: initialOutputHeight, getTreatment, getSetting, getTime }) {
  let sourceWidth = initialSourceWidth, sourceHeight = initialSourceHeight;
  let outputWidth = initialOutputWidth, outputHeight = initialOutputHeight;
  let crtRenderer = null;
  function compileCrtShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'Unknown shader compilation failure');
  }
  function createCrtRenderer() {
    if (crtRenderer) return crtRenderer;
    if (crtRenderer === false) return null;
    const gl = outputCanvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) { crtRenderer = false; return null; }
    try {
      const program = gl.createProgram();
      const vertexShader = compileCrtShader(gl, gl.VERTEX_SHADER, CRT_VERTEX_SHADER);
      const fragmentShader = compileCrtShader(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT_SHADER);
      gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program);
      gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Unknown shader link failure');
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const position = gl.getAttribLocation(program, 'aPosition');
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      crtRenderer = {
        gl, program, texture, buffer, position,
        source: gl.getUniformLocation(program, 'uSource'),
        sourceSize: gl.getUniformLocation(program, 'uSourceSize'),
        outputSize: gl.getUniformLocation(program, 'uOutputSize'),
        strength: gl.getUniformLocation(program, 'uStrength'),
        curve: gl.getUniformLocation(program, 'uCurve'),
        separation: gl.getUniformLocation(program, 'uSeparation'),
        scanlines: gl.getUniformLocation(program, 'uScanlines'),
        mask: gl.getUniformLocation(program, 'uMask'),
        vignette: gl.getUniformLocation(program, 'uVignette'),
        drift: gl.getUniformLocation(program, 'uDrift'),
        bloom: gl.getUniformLocation(program, 'uBloom'),
        glow: gl.getUniformLocation(program, 'uGlow'),
        time: gl.getUniformLocation(program, 'uTime')
      };
    } catch (error) {
      console.warn('CRT renderer unavailable:', error);
      crtRenderer = false;
    }
    return crtRenderer || null;
  }
  function setOutputSize(nextWidth, nextHeight) {
    if (nextWidth === outputWidth && nextHeight === outputHeight) return;
    outputWidth = nextWidth; outputHeight = nextHeight;
    outputCanvas.width = outputWidth; outputCanvas.height = outputHeight;
  }
  function renderCrtPiFrame({ outputWidth: nextOutputWidth = sourceWidth, outputHeight: nextOutputHeight = sourceHeight } = {}) {
    const strength = CRT_STRENGTHS[getTreatment()];
    if (!strength) return sourceCanvas;
    setOutputSize(nextOutputWidth, nextOutputHeight);
    const renderer = createCrtRenderer();
    if (!renderer) return sourceCanvas;
    const { gl, program, texture, buffer, position, source, sourceSize, outputSize } = renderer;
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(source, 0); gl.uniform2f(sourceSize, sourceWidth, sourceHeight); gl.uniform2f(outputSize, outputWidth, outputHeight); gl.uniform1f(renderer.strength, strength);
    gl.uniform1f(renderer.curve, getSetting('curve')); gl.uniform1f(renderer.separation, getSetting('rgb'));
    gl.uniform1f(renderer.scanlines, getSetting('scanline')); gl.uniform1f(renderer.mask, getSetting('mask'));
    gl.uniform1f(renderer.vignette, getSetting('vignette')); gl.uniform1f(renderer.drift, getSetting('drift'));
    gl.uniform1f(renderer.bloom, getSetting('bloom')); gl.uniform1f(renderer.glow, getSetting('glow')); gl.uniform1f(renderer.time, getTime());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return outputCanvas;
  }
  function resize({ sourceWidth: nextSourceWidth, sourceHeight: nextSourceHeight, outputWidth: nextOutputWidth, outputHeight: nextOutputHeight }) {
    sourceWidth = nextSourceWidth; sourceHeight = nextSourceHeight;
    setOutputSize(nextOutputWidth, nextOutputHeight);
  }
  return { render: renderCrtPiFrame, resize };
}
