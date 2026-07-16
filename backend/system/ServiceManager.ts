import { IService, ServiceState } from '../runtime/types';
import { Logger } from './Logger';

export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, IService> = new Map();

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  public registerService(service: IService) {
    if (this.services.has(service.name)) {
      Logger.warn(`Service ${service.name} is already registered. Overwriting.`);
    }
    this.services.set(service.name, service);
    Logger.debug(`Registered service: ${service.name}`);
  }

  public getService(name: string): IService | undefined {
    return this.services.get(name);
  }

  public getAllServices(): IService[] {
    return Array.from(this.services.values());
  }

  public async startService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not found`);

    if (service.state === ServiceState.RUNNING) return;
    
    try {
      service.state = ServiceState.STARTING;
      await service.start();
      service.state = ServiceState.RUNNING;
      service.metrics.lastRestart = new Date();
    } catch (err: any) {
      service.state = ServiceState.FAILED;
      service.metrics.lastFailure = new Date();
      throw err;
    }
  }

  public async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) return;

    if (service.state === ServiceState.STOPPED) return;

    try {
      service.state = ServiceState.STOPPING;
      await service.stop();
      service.state = ServiceState.STOPPED;
    } catch (err: any) {
      service.state = ServiceState.FAILED;
      throw err;
    }
  }

  public async restartService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) return;

    service.state = ServiceState.RESTARTING;
    service.metrics.restartCount++;
    service.metrics.lastRestart = new Date();
    
    try {
      await service.restart();
      service.state = ServiceState.RUNNING;
    } catch (err: any) {
      service.state = ServiceState.FAILED;
      service.metrics.lastFailure = new Date();
      throw err;
    }
  }
}
