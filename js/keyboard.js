/**
 * Interactive Virtual Keyboard Component
 * Renders an accessible, responsive QWERTY keyboard with active target highlights,
 * keypress reactions, finger zone styling, and touch/click triggering.
 */
class VirtualKeyboard {
  constructor(containerElement, onKeyClick = null) {
    this.container = containerElement;
    this.onKeyClick = onKeyClick;
    this.keyElements = new Map();
    this.activeTargetKey = null;

    this.layout = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.']
    ];

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'keyboard-grid flex flex-col items-center gap-1.5 md:gap-2 w-full max-w-3xl select-none mx-auto';

    this.layout.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'flex justify-center items-center gap-1 md:gap-1.5 w-full';

      // Slight row indentations for realistic keyboard look
      if (rowIndex === 2) {
        rowEl.classList.add('pl-2', 'md:pl-4');
      } else if (rowIndex === 3) {
        rowEl.classList.add('pl-4', 'md:pl-8');
      }

      row.forEach(keyChar => {
        const keyBtn = document.createElement('button');
        keyBtn.type = 'button';
        keyBtn.setAttribute('data-key', keyChar.toUpperCase());
        keyBtn.className = 'v-key relative flex items-center justify-center font-mono font-bold transition-all duration-75 ' +
          'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-lg ' +
          'shadow-sm text-sm sm:text-base md:text-lg min-w-[32px] sm:min-w-[42px] md:min-w-[48px] h-10 sm:h-12 md:h-14 flex-1 max-w-[56px]';
        
        // Mark home row anchor keys (F and J)
        if (keyChar === 'F' || keyChar === 'J') {
          keyBtn.classList.add('home-anchor');
        }

        keyBtn.textContent = keyChar;

        keyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.onKeyClick) {
            this.onKeyClick(keyChar.toUpperCase());
          }
        });

        rowEl.appendChild(keyBtn);
        this.keyElements.set(keyChar.toUpperCase(), keyBtn);
      });

      wrapper.appendChild(rowEl);
    });

    this.container.appendChild(wrapper);
  }

  setTarget(keyChar) {
    if (this.activeTargetKey && this.keyElements.has(this.activeTargetKey)) {
      const prevEl = this.keyElements.get(this.activeTargetKey);
      prevEl.classList.remove('key-target');
    }

    this.activeTargetKey = keyChar ? keyChar.toUpperCase() : null;

    if (this.activeTargetKey && this.keyElements.has(this.activeTargetKey)) {
      const currentEl = this.keyElements.get(this.activeTargetKey);
      currentEl.classList.add('key-target');
    }
  }

  flashKey(keyChar, isCorrect) {
    const key = keyChar.toUpperCase();
    const el = this.keyElements.get(key);
    if (!el) return;

    const flashClass = isCorrect ? 'key-hit-success' : 'key-hit-error';
    el.classList.add(flashClass);

    setTimeout(() => {
      el.classList.remove(flashClass);
    }, 250);
  }

  highlightActiveSet(keySetArray) {
    const normalizedSet = new Set(keySetArray.map(k => k.toUpperCase()));
    this.keyElements.forEach((el, keyChar) => {
      if (normalizedSet.has(keyChar)) {
        el.classList.remove('opacity-30');
        el.classList.add('opacity-100');
      } else {
        el.classList.add('opacity-30');
        el.classList.remove('opacity-100');
      }
    });
  }

  resetHighlights() {
    this.setTarget(null);
    this.keyElements.forEach(el => {
      el.classList.remove('opacity-30', 'key-target', 'key-hit-success', 'key-hit-error');
      el.classList.add('opacity-100');
    });
  }
}
