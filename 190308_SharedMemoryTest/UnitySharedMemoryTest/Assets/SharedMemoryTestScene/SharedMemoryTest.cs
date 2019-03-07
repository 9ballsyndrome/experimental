using UnityEngine;

public class SharedMemoryTest: MonoBehaviour
{
    public ComputeShader computeShader;
    int kernelIndex;
    ComputeBuffer resultBuffer;

    void Start()
    {
        int numThreadsPerGroup = 512;
        int numGroups = 1;
        int numTotalThreads = numThreadsPerGroup * numGroups;

        this.kernelIndex = this.computeShader.FindKernel("main");

        this.resultBuffer = new ComputeBuffer(numTotalThreads, sizeof(float), ComputeBufferType.Raw);
        this.computeShader.SetBuffer(this.kernelIndex, "_ssbo", this.resultBuffer);

        this.computeShader.Dispatch(this.kernelIndex, numGroups, 1, 1);

        float[] result = new float[numTotalThreads];
        // There are no need to barrier, because GetData waits for GPU completion
        this.resultBuffer.GetData(result);

        Debug.Log("complete compute");

        int correctResult = (numThreadsPerGroup - 1) * numThreadsPerGroup / 2;
        for (int i = 0; i < numTotalThreads; i++)
        {
            if(result[i] != correctResult)
            {
                Debug.Log("check error: " + i + ", " + result[i]);
            }
        }

        Debug.Log("complete check errors");

        this.resultBuffer.Release();
    }
}