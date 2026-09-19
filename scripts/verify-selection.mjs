import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { chooseStructureHit, createSelectionInteraction } from '../lib/anatomy/selection.mjs';

function anatomyLayers() {
  const group = new Group();
  const layers = ['superficial', 'small-muscle', 'deep-muscle', 'far-side'].map((id, i) => {
    const mesh = new Mesh(new BoxGeometry(i === 1 ? 0.3 : 1, 1, 0.15), new MeshBasicMaterial({ side: DoubleSide }));
    mesh.userData.id = id;
    mesh.position.z = i === 3 ? -4 : 1 - i * 0.4;
    group.add(mesh);
    return mesh;
  });
  group.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(0.05, 0.1, 5), new Vector3(0, 0, -1));
  return { layers, group, hits: () => ray.intersectObjects(layers) };
}

test('ordinary clicks stay on the visible muscle; hiding it exposes the next selectable layer', () => {
  const { layers, hits } = anatomyLayers();
  assert.equal(chooseStructureHit(hits()), layers[0]);
  assert.equal(chooseStructureHit(hits(), { selectedId: 'superficial' }), layers[0]);
  layers[0].visible = false;
  assert.equal(chooseStructureHit(hits()), layers[1]);
  layers[1].visible = false;
  assert.equal(chooseStructureHit(hits()), layers[2]);
  layers[1].visible = true;
  assert.equal(chooseStructureHit(hits()), layers[1]);
});

test('small muscles remain selectable through ghosted coverings, and hidden groups cannot be selected', () => {
  const { layers, group, hits } = anatomyLayers();
  layers[0].userData.pickThrough = true;
  assert.equal(chooseStructureHit(hits()), layers[1]);
  group.visible = false;
  assert.equal(chooseStructureHit(hits()), undefined);
});

test('intentional layer cycling skips duplicate triangle hits and excludes the far side of the body', () => {
  const { layers, hits } = anatomyLayers();
  assert.equal(chooseStructureHit(hits(), { cycle: true, selectedId: 'superficial' }), layers[1]);
  assert.equal(chooseStructureHit(hits(), { cycle: true, selectedId: 'small-muscle' }), layers[2]);
  assert.equal(chooseStructureHit(hits(), { cycle: true, selectedId: 'deep-muscle' }), layers[0]);
});

const event = (overrides = {}) => ({ pointerId: 1, isPrimary: true, clientX: 30, clientY: 40, button: 0, buttons: 0, detail: 1, altKey: false, ...overrides });
function gestures() {
  const { layers } = anatomyLayers();
  let target = layers[1];
  const selections = [], focused = [];
  const controls = createSelectionInteraction({ pick: () => target, select: mesh => selections.push(mesh), focus: mesh => focused.push(mesh), start() {} });
  const click = e => { controls.down(e); controls.up(e); controls.click(e); };
  return { controls, click, selections, focused, layers, setTarget: mesh => { target = mesh; } };
}

test('double-click focuses the first selected muscle even when tissue opacity changes the ray hit', () => {
  const g = gestures();
  g.click(event());
  g.setTarget(g.layers[2]);
  g.click(event({ detail: 2 }));
  g.controls.doubleClick(event({ detail: 2 }));
  assert(g.selections.every(mesh => mesh === g.layers[1]));
  assert.deepEqual(g.focused, [g.layers[1]]);
  g.click(event());
  assert.equal(g.selections.at(-1), g.layers[2]);
});

test('rotation, right-button pan, cancelled touches, and pinch gestures never select a muscle', () => {
  const g = gestures();
  g.controls.down(event());
  g.controls.move(event({ clientX: 55, buttons: 1 }));
  g.controls.up(event()); // Moving back to the starting point is still a drag.
  g.controls.click(event());
  g.click(event({ button: 2 }));
  g.controls.down(event());
  g.controls.cancel(event());
  g.controls.click(event());
  g.controls.down(event());
  g.controls.down(event({ pointerId: 2, isPrimary: false }));
  g.controls.up(event({ pointerId: 2, isPrimary: false }));
  g.controls.up(event());
  g.controls.click(event());
  assert.deepEqual(g.selections, []);
  assert.deepEqual(g.focused, []);
});
