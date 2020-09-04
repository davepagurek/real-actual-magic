class Slide {
  constructor(node) {
    this.node = node;
    this.maxOrder = 0;
    this.order = 0;
    this.visible = false;
    this.blend = 'BLEND';
    const blendNode = node.querySelector('blend');
    if (blendNode) {
      blendNode.parentElement.removeChild(blendNode);
      this.blend = blendNode.getAttribute('data-type');
    }
    const defaultChannel = {
      x: 0,
      y: 0,
      mode: '#FFF',
      matte: '#000',
      isMatte: false,
      vizMatte: true,
      a: 1,
      b: 1,
      negate: false,
      order: 0,
      disappear: 0,
      tint: '#FFF',
      tone: '#000',
      bw: false,
      at: 0,
    };
    const numericKeys = {
      x: true,
      y: true,
      order: true,
      disapper: true,
      at: true,
      a: true,
      b: true,
    };
    const boolKeys = {
      negate: true,
      bw: true,
      isMatte: true,
      vizMatte: true,
    };
    const parseAttribs = (n, channel) => {
      for (const key in defaultChannel) {
        const value = n.getAttribute(`data-${key}`);
        if (value) {
          if (numericKeys[key]) {
            if (value.startsWith('#')) {
              const input = node.querySelector(value);
              channel[key] = parseFloat(input.value);
              input.addEventListener('change', () => {
                channel[key] = parseFloat(input.value);
              });
            } else {
              channel[key] = parseFloat(value);
            }
          } else if (boolKeys[key]) {
            channel[key] = value === 'true';
          } else {
            channel[key] = value;
          }
        }
      }
    };
    this.channels = Array.from(node.querySelectorAll('channel')).map(n => {
      n.parentElement.removeChild(n);
      const channel = { ...defaultChannel };
      parseAttribs(n, channel);

      channel.transitions = Array.from(n.querySelectorAll('transition')).map(t => {
        const update = {};
        parseAttribs(t, update);
        return update;
      });
      return channel;
    });
    if (this.channels.filter(c => c.order === 0).length === 0) {
      let minOrder = 0;
      if (this.channels.length > 0) {
        minOrder = Math.min(...this.channels.map(c => c.order));
      }
      this.channels.unshift({
        ...defaultChannel,
        disappear: minOrder,
        transitions: [],
      });
    }
    this.channels.forEach(c => {
      this.maxOrder = Math.max(this.maxOrder, c.order, ...c.transitions.map(t => t.at));
    });

    Array.from(node.querySelectorAll('*')).forEach(child => {
      const order = child.getAttribute('data-order');
      if (order) {
        this.maxOrder = Math.max(this.maxOrder, parseInt(order));
      }

      const disappear = child.getAttribute('data-disappear');
      if (disappear) {
        this.maxdisappear = Math.max(this.maxdisappear, parseInt(disappear));
      }

      if (child.classList.contains('disappearing')) {
        node.classList.add('unstretched');
        const style = child.getAttribute('style') || '';
        const oldStyle = node.getAttribute('style');
        node.setAttribute('style', 'display: block;');
        const width = child.getBoundingClientRect().width;
        const height = child.getBoundingClientRect().height;
        child.setAttribute(
          'style',
          `${style} max-width: ${width}px; max-height: ${height}px;`);
        node.setAttribute('style', oldStyle);
        node.classList.remove('unstretched');
      }
    });
  }

  stepChannelStates = () => {
    for (let i = 0; i < this.channelStates.length; i++) {
      for (const key of ['x', 'y']) {
        this.channelStates[i][key] +=
          (this.channelTargets[i][key] - this.channelStates[i][key]) / 10;
      }
      for (const key of ['a', 'b']) {
        this.channelStates[i][key] = this.channels[i][key];
      }
    }
    if (this.visible) {
      window.requestAnimationFrame(this.stepChannelStates)
    }
  }

  makeChannelTargets() {
    return this.channels.map(c => {
      // Copy everything but transitions
      const state = { ...c };
      delete state.transitions;

      // Apply any transitions up until now
      c.transitions.forEach(t => {
        if (t.at > this.order) return;
        for (const key in t) {
          state[key] = t[key];
        }
      });
      return state;
    });
  }

  setChannels() {
    this.channelStates = this.makeChannelTargets();
    this.channelTargets = this.makeChannelTargets();
  }

  // Resets the slide state and returns the DOMNode the slide will work in.
  show(fromStart) {
    window.colors.blend = this.blend;
    this.visible = true;
    if (fromStart) {
      this.order = 0;
    } else {
      this.order = this.maxOrder;
    }
    this.setChannels();
    this.update();
    window.requestAnimationFrame(this.stepChannelStates)

    return this.node;
  }

  hide() {
    this.visible = false;
  }

  // Steps the current slide. Returns `true` if the slide was able
  // to step itself, and `false` if it had no more steps.
  increment() {
    if (this.order === this.maxOrder) {
      return false;

    } else {
      this.order++;
      this.update();

      return true;
    }
  }

  // Steps back the current slide. Returns `true` if the slide was able
  // to step itself, and `false` if it had no more steps.
  decrement() {
    if (this.order === 0) {
      return false;

    } else {
      this.order--;
      this.update();

      return true;
    }
  }

  update() {
    this.channelTargets = this.makeChannelTargets();
    window.colors.channels = this.channelStates.filter(c =>
      c.order <= this.order && (!c.disappear || c.disappear > this.order));
    Array.from(this.node.querySelectorAll('*')).forEach(child => {
      const order = child.getAttribute('data-order');
      const disappear = child.getAttribute('data-disappear');
      const highlight = child.getAttribute('data-highlight');
      if (order || disappear) {
        if (!order || parseInt(order) <= this.order) {
          if (!disappear || disappear > this.order) {
            child.classList.remove('hidden');
          } else {
            child.classList.add('hidden');
          }
        } else {
          child.classList.add('hidden');
        }
      }
      if (highlight && parseInt(highlight) === this.order) {
        child.classList.add('highlighted');
      } else if (!child.classList.contains('fixed')) {
        child.classList.remove('highlighted');
      }
    });
  }
};

window.Slide = Slide;
