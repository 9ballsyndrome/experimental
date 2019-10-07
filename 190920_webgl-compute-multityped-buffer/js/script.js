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
      bool b1;
      bool b2;
      float f;
      uint u;
      int i;
    } ssbo;
    
    void main() {
      ssbo.f += (ssbo.b1 == true ? 4.0 : 8.0);
      ssbo.u += (ssbo.b2 == true ? 1u : 100u);
      ssbo.i += 1;
      ssbo.b1 = !ssbo.b1;
      ssbo.b2 = !ssbo.b2;
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

  const input = new ArrayBuffer(5 * 4); // alocate 20 Bytes(5 elements, each element has 4 Bytes)
  const uint32Data = new Uint32Array(input); // create ArrayBufferView from ArrayBuffer
  const float32Data = new Float32Array(input);
  const int32Data = new Int32Array(input);

  uint32Data[0] = true; // access first 4 Bytes via Uint32Array-ArrayBufferView
  uint32Data[1] = false;
  float32Data[2] = 16.25; // access third 4 Bytes via Float32Array-ArrayBufferView
  uint32Data[3] = 8; // access fourth 4 Bytes via Uint32Array-ArrayBufferView
  int32Data[4] = -11;

  const ssbo = context.createBuffer();
  context.bindBuffer(context.SHADER_STORAGE_BUFFER, ssbo);
  context.bufferData(context.SHADER_STORAGE_BUFFER, input, context.DYNAMIC_COPY);
  context.bindBufferBase(context.SHADER_STORAGE_BUFFER, 0, ssbo);

  context.useProgram(computeProgram);
  context.dispatchCompute(1, 1, 1);

  const result = new ArrayBuffer(5 * 4);
  context.getBufferSubData(context.SHADER_STORAGE_BUFFER, 0, new DataView(result)); // getBufferSubData() parameter 3 should be of ArrayBufferView, so I use DataView, but you can use any other ArrayBufferView like Float32Array
  const uint32Result = new Uint32Array(result);
  console.log('b1 =', uint32Result[0] === 1); // read first 4 Bytes data as Uint32Array
  console.log('b2 =', uint32Result[1] === 1);
  console.log('f =', (new Float32Array(result))[2]); // read third 4 Bytes data as Float32Array
  console.log('u =', uint32Result[3]); // read fourth 4 Bytes data as Uint32Array
  console.log('i =', (new Int32Array(result))[4]);
};

window.addEventListener('DOMContentLoaded', script);
