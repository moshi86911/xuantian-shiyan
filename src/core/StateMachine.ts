type StateKey = string;
type Hook = () => void;
type Guard = () => boolean;

export class StateMachine<S extends StateKey> {
  state: S;
  private enterHooks = new Map<S, Hook[]>();
  private exitHooks = new Map<S, Hook[]>();
  private guards = new Map<S, Guard>();

  constructor(initial: S) {
    this.state = initial;
  }

  onEnter(state: S, hook: Hook): void {
    if (!this.enterHooks.has(state)) this.enterHooks.set(state, []);
    this.enterHooks.get(state)!.push(hook);
  }

  onExit(state: S, hook: Hook): void {
    if (!this.exitHooks.has(state)) this.exitHooks.set(state, []);
    this.exitHooks.get(state)!.push(hook);
  }

  guard(state: S, g: Guard): void {
    this.guards.set(state, g);
  }

  transition(next: S): boolean {
    const g = this.guards.get(next);
    if (g && !g()) return false;

    // Exit hooks for current state
    const exitHooks = this.exitHooks.get(this.state) || [];
    for (const hook of exitHooks) hook();

    this.state = next;

    // Enter hooks for new state
    const enterHooks = this.enterHooks.get(next) || [];
    for (const hook of enterHooks) hook();

    return true;
  }
}