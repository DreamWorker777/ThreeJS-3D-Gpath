import create from "zustand"
import produce from "immer";

const pathStore = create(set => ({
  segments: [],
  imgScale: false, 
  createSegment: (id, delta) => set(produce(state => {
    state.segments.push({
      command: 'G01',
      target: {x: 0, y: 0, z: 0},
      editing: false,
    })
  })),
  updateSegment: (id, delta) => set(produce(state => {
    state.segments[id] = {...state.segments[id], ...delta}
  })),
  updateImgScale: (value) => set(produce(state => {
    state.imgScale = value
  })),
}))

export default pathStore
