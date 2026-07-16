import { IntentType } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';
import { ClickResolver } from './ClickResolver';
import { DragResolver } from './DragResolver';
import { DoubleClickResolver } from './DoubleClickResolver';
import { HoldResolver } from './HoldResolver';
import { ScrollResolver } from './ScrollResolver';

export class IntentResolver {
  private resolvers: IIntentResolver[] = [
    new DoubleClickResolver(), // Highest priority
    new DragResolver(),
    new ClickResolver(),
    new ScrollResolver(),
    new HoldResolver()
  ];

  public resolve(ctx: ResolverContext): { primary: IntentType; secondary: IntentType; confidence: number } {
    let primary = IntentType.NONE;
    let secondary = IntentType.POINTING; // Default secondary intent
    let confidence = 0.5;

    for (const resolver of this.resolvers) {
      const output = resolver.resolve(ctx);
      if (output && output.intent !== IntentType.NONE) {
        primary = output.intent;
        confidence = output.confidence;
        break; // First one wins in this hierarchical chain
      }
    }
    
    // Always consider pointing as secondary if hand is visible
    if (primary === IntentType.NONE && ctx.frame.activeGestures.length > 0) {
      primary = IntentType.POINTING;
    }

    return { primary, secondary, confidence };
  }
}
