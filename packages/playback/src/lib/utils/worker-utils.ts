export const createWorkerFromWorkerCodeFunctionWrapper = (workerCodeFunctionWrapper: () => void): Worker => {
  const workerCode = workerCodeFunctionWrapper.toString().replace('() => {', '').slice(0, -1);
  const workerCodeBlob = new Blob([workerCode], { type: 'application/javascript' });
  const workerCodeBlobUrl = URL.createObjectURL(workerCodeBlob);

  const worker = new Worker(workerCodeBlobUrl);
  const terminate = worker.terminate;
  worker.terminate = (): void => {
    URL.revokeObjectURL(workerCodeBlobUrl);
    terminate.call(worker);
  };

  return worker;
};
