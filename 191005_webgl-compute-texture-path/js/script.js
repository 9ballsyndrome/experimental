const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

const script = async () => {
  const canvas = document.getElementById('myCanvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const context = canvas.getContext('webgl2-compute', {antialias: false});
  if (!context) {
    document.body.className = 'error';
    return;
  }

  // language=GLSL
  const computeShaderSource1 = `#version 310 es
  layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
  layout (rgba8, binding = 0) writeonly uniform highp image2D frameTex;
  layout (rgba8, binding = 1) readonly uniform highp image2D accumulatedTex;
  uniform vec2 point;

  void main() {
      ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
      float distance = length(vec2(gl_GlobalInvocationID.xy) - point);
      float value = distance < 50.0 ? 100.0 / (distance * distance) : 0.0;
      vec4 frameColor = vec4(value, 0.0, 0.0, 1.0);
      vec4 previousColor = imageLoad(accumulatedTex, storePos);
      imageStore(frameTex, storePos, frameColor + previousColor * 0.9);
  }
  `;

  const computeShader1 = createShader(context, context.COMPUTE_SHADER, computeShaderSource1);
  const computeProgram1 = createProgram(context, computeShader1);
  const pointLocation = context.getUniformLocation(computeProgram1, 'point');

  // language=GLSL
  const computeShaderSource2 = `#version 310 es
  layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
  layout (rgba8, binding = 0) readonly uniform highp image2D frameTex;
  layout (rgba8, binding = 1) writeonly uniform highp image2D accumulatedTex;

  void main() {
      ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
      vec4 color = imageLoad(frameTex, storePos);
      imageStore(accumulatedTex, storePos, color);
  }
  `;

  const computeShader2 = createShader(context, context.COMPUTE_SHADER, computeShaderSource2);
  const computeProgram2 = createProgram(context, computeShader2);

  const frameTexture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, frameTexture);
  context.texStorage2D(context.TEXTURE_2D, 1, context.RGBA8, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.bindImageTexture(0, frameTexture, 0, false, 0, context.READ_WRITE, context.RGBA8);

  const accumulatedTexture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, accumulatedTexture);
  context.texStorage2D(context.TEXTURE_2D, 1, context.RGBA8, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.bindImageTexture(1, accumulatedTexture, 0, false, 0, context.READ_WRITE, context.RGBA8);

  // language=GLSL
  const vertexShaderSource = `#version 310 es
  layout (location = 0) in vec2 position;
  out vec2 vUV;

  void main() {
      gl_Position = vec4(position, 0.0, 1.0);
      vUV = (position + vec2(1.0)) * 0.5;
  }
  `;

  // language=GLSL
  const fragmentShaderSource = `#version 310 es
  precision highp float;
  uniform sampler2D tex;
  in vec2 vUV;
  out vec4 outColor;

  void main() {
      outColor = texture(tex, vUV);
  }
  `;

  const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
  const renderProgram = createProgram(context, vertexShader, fragmentShader);

  const textureLocation = context.getUniformLocation(renderProgram, 'tex');
  context.activeTexture(context.TEXTURE0);
  context.bindTexture(context.TEXTURE_2D, accumulatedTexture);

  const screenVertexBuffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, screenVertexBuffer);
  context.bufferData(context.ARRAY_BUFFER, new Float32Array([
    -1.0, 1.0,
    -1.0, -1.0,
    1.0, 1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, -1.0
  ]), context.STATIC_COPY);

  context.bindBuffer(context.ARRAY_BUFFER, screenVertexBuffer);
  context.enableVertexAttribArray(0);
  context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0);

  context.clearColor(0.0, 0.0, 0.0, 1.0);

  let mouseX = CANVAS_WIDTH * 0.5;
  let mouseY = CANVAS_HEIGHT * 0.5;
  canvas.addEventListener('mousemove', event => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = CANVAS_HEIGHT - (event.clientY - rect.top);
  });

  const render = () => {
    context.clear(context.COLOR_BUFFER_BIT);

    context.bindImageTexture(0, frameTexture, 0, false, 0, context.READ_WRITE, context.RGBA8);
    context.bindImageTexture(1, accumulatedTexture, 0, false, 0, context.READ_WRITE, context.RGBA8);

    context.useProgram(computeProgram1);
    context.uniform2f(pointLocation, mouseX, mouseY);
    context.dispatchCompute(CANVAS_WIDTH / 16, CANVAS_HEIGHT / 16, 1);
    context.memoryBarrier(context.SHADER_IMAGE_ACCESS_BARRIER_BIT);

    context.useProgram(computeProgram2);
    context.dispatchCompute(CANVAS_WIDTH / 16, CANVAS_HEIGHT / 16, 1);
    context.memoryBarrier(context.TEXTURE_FETCH_BARRIER_BIT);

    context.useProgram(renderProgram);
    context.uniform1i(textureLocation, 0);
    context.drawArrays(context.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  };

  render();
};

const createShader = (context, type, source) => {
  const shader = context.createShader(type);
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    console.log(context.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};

const createProgram = (context, shader1, shader2) => {
  const program = context.createProgram();
  context.attachShader(program, shader1);
  if (shader2) {
    context.attachShader(program, shader2);
  }
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    console.log(context.getProgramInfoLog(program));
    return null;
  }
  return program;
};

window.addEventListener('DOMContentLoaded', script);
