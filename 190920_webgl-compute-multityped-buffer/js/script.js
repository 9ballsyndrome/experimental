const script = async () => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2-compute');
  if (!context) {
    document.body.className = 'error';
    return;
  }

  // language=GLSL
  const computeShaderSource = `#version 310 es
    layout (local_size_x = 1, local_size_y = 1, local_size_z = 1) in;
    layout (std430, binding = 0) buffer SSBO {
     float f;
     uint u;
     int i;
    } ssbo;
    
    void main() {
      ssbo.f += 4.0;
      ssbo.u += 1u;
      ssbo.i += 1;
    }
    `;

  const computeShader = context.createShader(context.COMPUTE_SHADER);
  context.shaderSource(computeShader, computeShaderSource);
  context.compileShader(computeShader);
  if (!context.getShaderParameter(computeShader, context.COMPILE_STATUS)) {
    console.log(context.getShaderInfoLog(computeShader));
    return;
  }

  const computeProgram = context.createProgram();
  context.attachShader(computeProgram, computeShader);
  context.linkProgram(computeProgram);
  if (!context.getProgramParameter(computeProgram, context.LINK_STATUS)) {
    console.log(context.getProgramInfoLog(computeProgram));
    return;
  }

  const input = new ArrayBuffer(3 * 4); // alocate 12 Bytes(3 elements, each element has 4 Bytes)
  const float32Data = new Float32Array(input); // create ArrayBufferView from ArrayBuffer
  float32Data[0] = 16.25; // access first 4 Bytes via Float32Array-ArrayBufferView
  const uint32Data = new Uint32Array(input);
  uint32Data[1] = 8; // access second 4 Bytes via Uint32Array-ArrayBufferView
  const int32Data = new Int32Array(input);
  uint32Data[2] = -11;

  const ssbo = context.createBuffer();
  context.bindBuffer(context.SHADER_STORAGE_BUFFER, ssbo);
  context.bufferData(context.SHADER_STORAGE_BUFFER, input, context.DYNAMIC_COPY);
  context.bindBufferBase(context.SHADER_STORAGE_BUFFER, 0, ssbo);

  context.useProgram(computeProgram);
  context.dispatchCompute(1, 1, 1);

  const result = new ArrayBuffer(3 * 4);
  context.getBufferSubData(context.SHADER_STORAGE_BUFFER, 0, new DataView(result)); // getBufferSubData() parameter 3 should be of ArrayBufferView, so I use DataView, but you can use any other ArrayBufferView like Float32Array
  console.log((new Float32Array(result))[0]); // read first 4 Bytes data as Float32Array
  console.log((new Uint32Array(result))[1]); // read second 4 Bytes data as Uint32Array
  console.log((new Int32Array(result))[2]);
};

window.addEventListener('DOMContentLoaded', script);
