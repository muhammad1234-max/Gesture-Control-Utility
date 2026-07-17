import { EventEmitter } from 'events';

export interface AgentMessage {
  id: string;
  sender: string;
  target?: string;
  type: string;
  payload: any;
  timestamp: number;
}

export class AgentBus {
  private static instance: AgentBus;
  private emitter = new EventEmitter();

  private constructor() {
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): AgentBus {
    if (!AgentBus.instance) {
      AgentBus.instance = new AgentBus();
    }
    return AgentBus.instance;
  }

  public publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now()
    };
    
    // Global broadcast or targeted
    if (fullMessage.target) {
      this.emitter.emit(`agent:${fullMessage.target}`, fullMessage);
    } else {
      this.emitter.emit(fullMessage.type, fullMessage);
    }
  }

  public subscribe(typeOrTarget: string, callback: (msg: AgentMessage) => void): void {
    this.emitter.on(typeOrTarget, callback);
  }

  public unsubscribe(typeOrTarget: string, callback: (msg: AgentMessage) => void): void {
    this.emitter.off(typeOrTarget, callback);
  }
}
