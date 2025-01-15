import { PipelineLoaderFactoryStorage } from '../utils/pipeline-loader-factory-storage';
import { WorkerBridge } from './worker-bridge';

WorkerBridge.create(new PipelineLoaderFactoryStorage());
