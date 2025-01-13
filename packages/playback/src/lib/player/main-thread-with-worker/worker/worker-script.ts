import { PipelineLoaderFactoryStorage } from '../../base/pipeline-loader-factory-storage';
import { WorkerBridge } from './worker-bridge';

WorkerBridge.create(new PipelineLoaderFactoryStorage());
