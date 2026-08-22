/* midi.js — Web MIDI：接上真實電鋼琴 / MIDI 主控鍵盤 */

export class MidiInput {
  constructor() {
    this.access = null;
    this.inputs = [];
    this.currentId = null;
    this.onNoteOn = () => {};
    this.onNoteOff = () => {};
    this.onPedal = () => {};
    this.onDevicesChanged = () => {};
    this.supported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
  }

  async connect() {
    if (!this.supported) throw new Error('這個瀏覽器不支援 Web MIDI（建議使用 Chrome / Edge）');
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => this._refresh();
    this._refresh();
    if (!this.currentId && this.inputs.length) this.select(this.inputs[0].id);
    return this.inputs;
  }

  _refresh() {
    this.inputs = this.access ? [...this.access.inputs.values()] : [];
    // 裝置被拔掉時自動改接下一台
    if (this.currentId && !this.inputs.some((i) => i.id === this.currentId)) {
      this.currentId = null;
      if (this.inputs.length) this.select(this.inputs[0].id);
    }
    this.onDevicesChanged(this.inputs);
  }

  select(id) {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) input.onmidimessage = null;
    const input = [...this.access.inputs.values()].find((i) => i.id === id);
    if (!input) return;
    this.currentId = id;
    input.onmidimessage = (e) => this._handle(e.data);
  }

  _handle(data) {
    const status = data[0] & 0xf0;
    const d1 = data[1];
    const d2 = data[2];
    if (status === 0x90 && d2 > 0) {
      this.onNoteOn(d1, d2 / 127);
    } else if (status === 0x80 || (status === 0x90 && d2 === 0)) {
      this.onNoteOff(d1);
    } else if (status === 0xb0 && d1 === 64) {
      this.onPedal(d2 >= 64);            // CC64 延音踏板
    }
  }

  disconnect() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) input.onmidimessage = null;
    this.currentId = null;
  }
}

export const midiInput = new MidiInput();
