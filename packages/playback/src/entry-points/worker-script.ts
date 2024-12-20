import { WorkerScript } from '../lib/player/main-thread-with-worker/worker/worker-script';
import { PipelineLoaderFactoryStorage } from '../lib/player/base/pipeline-loader-factory-storage';

WorkerScript.create(new PipelineLoaderFactoryStorage());
