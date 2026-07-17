import { StartupManager } from './StartupManager';
import { ShutdownManager } from './ShutdownManager';
import { HealthManager } from './HealthManager';
import { Logger } from '../system/Logger';
import { AIOrchestrator } from '../ai/AIOrchestrator';
import { ContextEngine } from '../context/ContextEngine';
import { AgentManager } from '../agents/AgentManager';

export class RuntimeManager {
  private static instance: RuntimeManager;

  // Event Hooks
  public onServiceStarted: ((serviceName: string) => void)[] = [];
  public onServiceStopped: ((serviceName: string) => void)[] = [];
  public onServiceRestarted: ((serviceName: string) => void)[] = [];
  public onPluginLoaded: ((pluginName: string) => void)[] = [];
  public onPluginUnloaded: ((pluginName: string) => void)[] = [];
  public onRuntimeReady: (() => void)[] = [];
  public onShutdown: (() => void)[] = [];
  public onCriticalFailure: ((serviceName: string, error: string) => void)[] = [];

  private constructor() {}

  public static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager();
    }
    return RuntimeManager.instance;
  }

  public async boot() {
    try {
      Logger.info('--- RuntimeManager Boot Sequence Started ---');
      
      // 1. Execute Dependency/Startup DAG
      await StartupManager.getInstance().executeStartup();

      // 2. Start Health Polling
      HealthManager.getInstance().startMonitoring();

      // 3. Start Phase 10 AI Subsystems
      Logger.info('Starting ContextEngine, AIOrchestrator, and AgentManager...');
      ContextEngine.getInstance().start();
      await AIOrchestrator.getInstance().initialize();
      AgentManager.getInstance();

      // 4. Fire Hooks
      this.onRuntimeReady.forEach(cb => cb());
      Logger.info('--- RuntimeManager Boot Sequence Completed ---');

      // Intercept process signals for graceful shutdown
      process.on('SIGINT', this.handleExit.bind(this));
      process.on('SIGTERM', this.handleExit.bind(this));

    } catch (err: any) {
      Logger.error('RuntimeManager Boot Sequence Failed!', { error: err.message });
      this.onCriticalFailure.forEach(cb => cb('RuntimeManager', err.message));
      process.exit(1);
    }
  }

  private async handleExit() {
    Logger.info('OS Shutdown signal received.');
    this.onShutdown.forEach(cb => cb());
    HealthManager.getInstance().stopMonitoring();
    ContextEngine.getInstance().stop();
    await AIOrchestrator.getInstance().shutdown();
    await ShutdownManager.getInstance().executeShutdown();
    process.exit(0);
  }
}
