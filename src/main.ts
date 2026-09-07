// src/main.ts
// 玄天试炼 — 入口文件：初始化 GameStateMachine / SaveManager / Renderer /
// InputHandler，启动主循环。

import { GameStateMachine, initialState } from './core/GameStateMachine';
import { SaveManager } from './core/SaveManager';
import { Renderer } from './ui/Renderer';
import { InputHandler, type InputAction } from './ui/InputHandler';

// Canvas setup
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const inputHandler = new InputHandler(canvas);
const saveManager = new SaveManager();

// On boot: load slot 0 if non-null so the main-menu "Continue" button can
// reflect the latest disk save.
const savedSlot = saveManager.load(0);
const initial = initialState();
if (savedSlot) {
  initial.saveSlots = [savedSlot, null, null];
}

const machine = new GameStateMachine(initial);

// ---- Side effects (auto-save + slot refresh) ---------------------------
machine.onTransition((_from, to) => {
  const state = machine.getState();
  if (to === 'map' && state.run) {
    // Save whenever we land back on the map (node complete checkpoint).
    saveManager.save(0, state.run);
  }
  // Refresh slot 0 whenever we re-enter main_menu so "Continue" is accurate.
  if (to === 'main_menu') {
    const fresh = saveManager.load(0);
    machine.updateOptions({ savedSlot: fresh });
  }
});

// ---- Input wiring ------------------------------------------------------
canvas.addEventListener('click', (e) => {
  const action: InputAction = inputHandler.handleClick(e, machine.getState());
  if (action.type === 'noop') return;

  // Patch the character_confirm id from the highlighted selection.
  if (action.type === 'character_confirm' && !action.characterId) {
    const state = machine.getState();
    const id = state.selectedCharacterId;
    if (!id) return; // nothing highlighted, ignore
    machine.dispatch({ type: 'character_confirm', characterId: id });
    return;
  }

  // The InputHandler returns a wider InputAction union than the
  // GameStateMachine's DispatchAction. Cast through a narrowing helper.
  machine.dispatch(action as any);
});

// ---- Main render loop --------------------------------------------------
function loop(): void {
  renderer.render(machine.getState());
  requestAnimationFrame(loop);
}
loop();
