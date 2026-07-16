import { ServiceManager } from '../system/ServiceManager';
import { IService } from './types';
import { Logger } from '../system/Logger';

export class StartupManager {
  private static instance: StartupManager;
  private startupOrder: IService[] = [];

  private constructor() {}

  public static getInstance(): StartupManager {
    if (!StartupManager.instance) {
      StartupManager.instance = new StartupManager();
    }
    return StartupManager.instance;
  }

  public buildDependencyGraph() {
    const services = ServiceManager.getInstance().getAllServices();
    
    // Kahn's Algorithm for Topological Sorting
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    services.forEach(s => {
      inDegree.set(s.name, 0);
      adjList.set(s.name, []);
    });

    services.forEach(s => {
      s.dependencies.forEach(dep => {
        if (!inDegree.has(dep)) {
          throw new Error(`Missing dependency ${dep} for service ${s.name}`);
        }
        adjList.get(dep)!.push(s.name);
        inDegree.set(s.name, inDegree.get(s.name)! + 1);
      });
    });

    const queue: string[] = [];
    inDegree.forEach((degree, name) => {
      if (degree === 0) queue.push(name);
    });

    const sortedOrder: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedOrder.push(current);

      adjList.get(current)!.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (sortedOrder.length !== services.length) {
      throw new Error('Cyclic dependency detected in services');
    }

    this.startupOrder = sortedOrder.map(name => ServiceManager.getInstance().getService(name)!);
    Logger.debug('Service Dependency Graph Built:', sortedOrder);
  }

  public async executeStartup() {
    this.buildDependencyGraph();

    for (const service of this.startupOrder) {
      Logger.info(`Initializing Service: ${service.name}...`);
      await service.initialize();
    }

    for (const service of this.startupOrder) {
      Logger.info(`Starting Service: ${service.name}...`);
      await ServiceManager.getInstance().startService(service.name);

      // Wait until ready
      let isReady = await service.readyCheck();
      let retries = 0;
      while (!isReady && retries < 20) {
        await new Promise(res => setTimeout(res, 500));
        isReady = await service.readyCheck();
        retries++;
      }

      if (!isReady) {
        throw new Error(`Service ${service.name} failed readiness check after startup.`);
      }
    }
    
    Logger.info('All services started and ready.');
  }
}
