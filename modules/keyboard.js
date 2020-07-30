import { add, sub, mul, div } from '/modules/global.js'
import {
  changeCursor,
  changeCanvas,
  draw,
  erase,
  automate,
  invert,
  setCropCache,
  flipHorizontal,
  flipVertical,
  flow,
  nextAction,
  selectAction,
  loadImage,
  setHelp,
  travelHistory,
  saveImage,
  clearCanvas,
  prevAction,
} from '/modules/actions.js'
import { renderHelp } from '/modules/help.js'
import { render } from '/modules/render.js'
import state from '/modules/state.js'

let km = state.km
let should_rerender = false

let kdown = () => km.j || km.arrowdown
let kup = () => km.k || km.arrowup
let kleft = () => km.h || km.arrowleft
let kright = () => km.l || km.arrowright
let hjkl = () => kdown(km) || kup(km) || kleft(km) || kright(km)

function handleResizeCanvas() {
  if (km.shift) {
    if (kdown()) changeCanvas([0, 1, 0, -1])
    if (kup()) changeCanvas([0, -1, 0, 1])
    if (kleft()) changeCanvas([-1, 0, 1, 0])
    if (kright()) changeCanvas([1, 0, -1, 0])
  } else {
    if (kdown()) changeCanvas([0, 0, 0, 1])
    if (kup()) changeCanvas([0, 0, 0, -1])
    if (kleft()) changeCanvas([0, 0, -1, 0])
    if (kright()) changeCanvas([0, 0, 1, 0])
  }
  should_rerender = true
}
function handleMoveCursor(cursor_name) {
  let { nudge, big_nudge } = state
  let move = km.shift ? big_nudge : nudge
  if (kdown()) changeCursor(cursor_name, [0, move, 0, 0])
  if (kup()) changeCursor(cursor_name, [0, -move, 0, 0])
  if (kleft()) changeCursor(cursor_name, [-move, 0, 0, 0])
  if (kright()) changeCursor(cursor_name, [move, 0, 0, 0])
  should_rerender = true
}
function handleResizeCursor(cursor_name) {
  if (km.shift) {
    if (kdown()) changeCursor(cursor_name, [0, 1, 0, -1])
    if (kup()) changeCursor(cursor_name, [0, -1, 0, 1])
    if (kleft()) changeCursor(cursor_name, [-1, 0, 1, 0])
    if (kright()) changeCursor(cursor_name, [1, 0, -1, 0])
  } else {
    if (kdown()) changeCursor(cursor_name, [0, 0, 0, 1])
    if (kup()) changeCursor(cursor_name, [0, 0, 0, -1])
    if (kleft()) changeCursor(cursor_name, [0, 0, -1, 0])
    if (kright()) changeCursor(cursor_name, [0, 0, 1, 0])
  }
  should_rerender = true
}

function setMode(new_mode) {
  state.mode = new_mode
  renderHelp()
}

function keyAction(key, e) {
  // numbers
  if (km['1'] || (state.mode === 'resize_draw' && (km.escape || km.enter))) {
    setMode('draw')
    should_rerender = true
  }
  if (
    km['2'] ||
    (state.mode === 'resize_automata' && (km.escape || km.enter))
  ) {
    setMode('automata')
    should_rerender = true
  }
  if (
    km['2'] ||
    (state.mode === 'resize_automata' && (km.escape || km.enter))
  ) {
    setMode('automata')
    should_rerender = true
  }
  if (km['3']) {
    setCropCache()
    state.mode_cache = state.mode
    setMode('resize_canvas')
    should_rerender = true
  }
  if (state.mode === 'resize_canvas' && (km.escape || km.enter)) {
    setMode(state.mode_cache)
    should_rerender = true
  }
  if (state.mode === 'select' && (km.escape || km.enter)) {
    setMode(state.mode_cache)
    should_rerender = true
  }
  if (km['?']) {
    state.show_help = !state.show_help
    setHelp()
  }

  if (km.y) {
    if (state.mode === 'draw') {
      setMode('resize_draw')
      should_rerender = true
    }
    if (state.mode === 'automata') {
      setMode('resize_automata')
      should_rerender = true
    }
  }
  if (km.u) {
    state.show_grid = !state.show_grid
    should_rerender = true
  }
  // toggle mode
  if (km.i) {
    if (state.mode === 'draw') {
      setMode('automata')
    } else if (state.mode === 'resize_draw') {
      setMode('resize_automata')
    } else if (state.mode === 'automata') {
      setMode('draw')
    } else if (state.mode === 'resize_automata') {
      setMode('resize_draw')
    }
    should_rerender = true
  }
  if (key === 'o') {
    // needed to use key because it seems like keyup does not register with file input open
    // load image
    loadImage()
  }
  if (key === 'p') {
    // save as png
    saveImage()
  }

  if (km.z) {
    // undo has its own rerender
    if (km.shift) {
      travelHistory('forward')
    } else {
      travelHistory()
    }
  }

  // rerender mode change
  if (should_rerender) {
    should_rerender = false
    render()
  }

  // short circuit for special select controls
  if (state.mode === 'select') {
    if (state.act === 'flow') {
      if ('wasd'.indexOf(key) !== -1) {
        if (key === 's') state.flow_choice = 'south'
        if (key === 'w') state.flow_choice = 'north'
        if (key === 'a') state.flow_choice = 'west'
        if (key === 'd') state.flow_choice = 'east'
        setMode(state.mode_cache)
        render()
        return
      } else if (km.enter || km.escape) {
        setMode(state.mode_cache)
        render()
        return
      }
    }
    if (state.act === 'ant') {
      if ('wasd'.indexOf(key) !== -1 || hjkl(km)) {
        let proposed = state.ant_position.slice()
        if (kdown()) proposed[1] += 1
        if (kup()) proposed[1] -= 1
        if (kleft()) proposed[0] -= 1
        if (kright()) proposed[0] += 1
        if (
          proposed[0] >= 0 &&
          proposed[1] >= 0 &&
          proposed[0] < state.auto_cursor[2] &&
          proposed[1] < state.auto_cursor[3]
        )
          state.ant_position = proposed
        if (key === 's') state.ant_dir = 'south'
        if (key === 'w') state.ant_dir = 'north'
        if (key === 'a') state.ant_dir = 'west'
        if (key === 'd') state.ant_dir = 'east'
        render()
        return
      } else if (km.enter || km.escape) {
        setMode(state.mode_cache)
        render()
        return
      }
    }
  }

  if (state.mode === 'draw') {
    if (hjkl(km)) handleMoveCursor('draw_cursor')
  } else if (state.mode === 'resize_draw') {
    if (hjkl(km)) handleResizeCursor('draw_cursor')
  } else if (state.mode === 'automata') {
    if (hjkl(km)) handleMoveCursor('auto_cursor')
  } else if (state.mode === 'resize_automata') {
    if (hjkl(km)) handleResizeCursor('auto_cursor')
  }
  if (state.mode === 'draw' || state.mode === 'automata') {
    if (km.e) {
      erase(state.draw_cursor)
      should_rerender = true
    }
    if (km.a) {
      automate(state.auto_cursor)
      should_rerender = true
    }
    if (km.s) {
      if (state.act === 'flow' || state.act === 'ant') {
        state.mode_cache = state.mode
        setMode('select')
        should_rerender = true
      }
    }
    if (km.d) {
      draw(state.draw_cursor)
      should_rerender = true
    }
    if (km.f) {
      // flipVertical(state.auto_cursor)
      // should_rerender = true
    }
    if (km.g) {
      // flipHorizontal(state.auto_cursor)
      // should_rerender = true
    }
    if (km.x) {
      // invert(state.auto_cursor)
      // should_rerender = true
    }
    if (km.c) {
      // clear auto
      // erase(state.auto_cursor)
      // should_rerender = true
      clearCanvas()
      should_rerender = true
    }
    if (km.b) {
      // prev automata
    }

    if (km.n) {
      // next automata
      if (km.shift) {
        prevAction()
      } else {
        nextAction()
      }
      renderHelp()
      should_rerender = true
    }
  }
  if (state.mode === 'resize_canvas') {
    if (hjkl(km)) handleResizeCanvas()
  }

  // rerender after action
  if (should_rerender) {
    should_rerender = false
    render()
  }
}

function keyhjkl(key) {
  return (
    key === 'h' ||
    key === 'j' ||
    key === 'k' ||
    key === 'l' ||
    key === 'arrowleft' ||
    key === 'arrowup' ||
    key === 'arrowdown' ||
    key === 'arrowright'
  )
}
export function downHandler(e) {
  let key = e.key.toLowerCase()
  km[key] = true
  km.ctrl = e.ctrlKey
  km.shift = e.shiftKey
  keyAction(key, e)
  if (key === 'shift') {
    km.shift = true
    render('no_history')
  }
}

export function upHandler(e) {
  let key = e.key.toLowerCase()
  km[key] = false
  km.ctrl = e.ctrlKey
  km.shift = e.shiftKey
  if (key === 'shift') {
    km.shift = false
    render('no_history')
  }
}

export function buttonTrigger(key) {
  km[key] = true
  keyAction(key, {})
  setTimeout(() => {
    km[key] = false
  }, 200)
}
export function autoTrigger(name) {
  selectAction(name)
  render()
  renderHelp()
}
