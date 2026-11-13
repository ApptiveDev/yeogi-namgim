const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');

const source = readFileSync(require.resolve('../src/hooks/use-ui-motion.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loadHook = new Function('require', 'exports', compiled);
const defaultEasing = { enter: (t) => 1 - (1 - t) ** 3, exit: (t) => t ** 3 };

function createMotionRenderer(timing = { enter: 200, exit: 120 }) {
  const animations = [];
  const state = [];
  let nextState;
  let renderAgain;
  let pendingEffect;
  let effect;
  let cleanup;
  let reduceMotion = false;

  const mocks = {
    react: {
      useState(initial) {
        const index = nextState++;
        if (!(index in state)) {
          state[index] = {
            value: typeof initial === 'function' ? initial() : initial,
            set(next) {
              if (Object.is(state[index].value, next)) return;
              state[index].value = next;
              renderAgain = true;
            },
          };
        }
        return [state[index].value, state[index].set];
      },
      useLayoutEffect(run, dependencies) {
        pendingEffect = { run, dependencies };
      },
    },
    'react-native': {
      Animated: {
        Value: class {
          constructor(value) { this.value = value; }
          setValue(value) { this.value = value; }
        },
        timing(progress, { toValue, easing }) {
          const animation = {
            easing,
            stopped: false,
            start(callback) { this.callback = callback; },
            stop() { this.stopped = true; },
            finish() {
              if (!this.stopped) progress.setValue(toValue);
              this.callback({ finished: true });
            },
          };
          animations.push(animation);
          return animation;
        },
      },
    },
    '@/constants/ui-motion': { MOTION_EASING: defaultEasing },
    '@/hooks/use-motion-preference': { useMotionPreference: () => reduceMotion },
  };
  const exports = {};
  loadHook((id) => mocks[id], exports);

  return {
    animations,
    render(value, reduced = false) {
      reduceMotion = reduced;
      let result;
      do {
        renderAgain = false;
        nextState = 0;
        result = exports.useVisibilityMotion(value, timing);
      } while (renderAgain);

      if (!effect || pendingEffect.dependencies.some((dep, index) => !Object.is(dep, effect.dependencies[index]))) {
        cleanup?.();
        effect = pendingEffect;
        cleanup = effect.run();
      }
      return result;
    },
  };
}

test('a late exit completion cannot hide a reopened notification', () => {
  const ui = createMotionRenderer();
  ui.render('첫 메시지');
  const closing = ui.render(null);
  const exit = ui.animations.at(-1);
  assert.equal(closing.content, '첫 메시지');
  assert.equal(closing.interactionProps.pointerEvents, 'none');
  assert.equal(closing.interactionProps.accessibilityElementsHidden, true);

  assert.equal(ui.render('새 메시지').content, '새 메시지');
  assert.equal(exit.stopped, true);
  exit.finish();
  assert.equal(ui.render(null).content, '새 메시지');
  ui.animations.at(-1).finish();
  assert.equal(ui.render(null).content, null);
});

test('updating visible text preserves the transition and uses the new text on exit', () => {
  const ui = createMotionRenderer();
  ui.render('불러오는 중');
  ui.render('완료');
  assert.equal(ui.animations.length, 1);
  assert.equal(ui.render(null).content, '완료');
  assert.equal(ui.animations.at(-1).easing, defaultEasing.exit);
});

test('a custom closing curve applies only to the exit transition', () => {
  const exitEasing = (t) => t;
  const ui = createMotionRenderer({ enter: 280, exit: 200, exitEasing });
  ui.render('쪽지 목록');
  assert.equal(ui.animations.at(-1).easing, defaultEasing.enter);
  ui.render(null);
  assert.equal(ui.animations.at(-1).easing, exitEasing);
});

test('reduced motion settles an active transition immediately and skips later animations', () => {
  const ui = createMotionRenderer();
  ui.render('팝업');
  ui.render(null);
  const exit = ui.animations.at(-1);

  assert.equal(ui.render(null, true).content, null);
  assert.equal(exit.stopped, true);
  const reopened = ui.render('새 팝업', true);
  assert.equal(reopened.opacity, 1);
  assert.equal(reopened.progress.value, 1);
  assert.equal(ui.render(null, true).content, null);
  assert.equal(ui.animations.length, 2);
});
