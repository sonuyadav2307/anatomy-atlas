/**
 * Choose one anatomical structure from the intersections under the pointer.
 * Normal clicks stay on the visible surface. Alt-click deliberately cycles
 * nearby layers; duplicate front/back triangle hits never advance the cycle.
 *
 * @param {import('three').Intersection[]} intersections
 * @param {{cycle?: boolean, selectedId?: string | null}} options
 */
export function chooseStructureHit(intersections, { cycle = false, selectedId = null } = {}) {
  const seen = new Set();
  const hits = intersections.filter(({ object }) => {
    const id = object.userData.id;
    if (!id || seen.has(id)) return false;
    for (let parent = object; parent; parent = parent.parent) {
      if (!parent.visible) return false;
    }
    seen.add(id);
    return true;
  });
  if (!hits.length) return;
  if (!cycle) return (hits.find(hit => !hit.object.userData.pickThrough) || hits[0]).object;

  const stack = hits.filter(hit => hit.distance - hits[0].distance <= 1.2);
  const selectedIndex = stack.findIndex(hit => hit.object.userData.id === selectedId);
  return stack[(selectedIndex + 1) % stack.length].object;
}

/**
 * Keep click selection separate from OrbitControls' drag/pinch gestures.
 * @param {{pick: (event: MouseEvent, cycle: boolean) => import('three').Object3D | undefined,
 * select: (mesh: import('three').Object3D) => void,
 * focus: (mesh: import('three').Object3D) => void,
 * start: () => void}} callbacks
 */
export function createSelectionInteraction({ pick, select, focus, start }) {
  const pointers = new Set();
  let origin = { x: 0, y: 0 };
  let dragged = false, multiplePointers = false, canSelect = false;
  /** @type {import('three').Object3D | undefined} */
  let firstClickMesh;
  const moved = event => Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5;
  return {
    down(event) {
      if (!pointers.size) {
        dragged = false;
        multiplePointers = false;
        origin = { x: event.clientX, y: event.clientY };
      }
      pointers.add(event.pointerId);
      if (pointers.size > 1) multiplePointers = true;
      canSelect = false;
      start();
    },
    move(event) {
      if (!event.buttons && !pointers.size) return false;
      if (moved(event)) dragged = true;
      return true;
    },
    up(event) {
      pointers.delete(event.pointerId);
      canSelect = event.button === 0 && event.isPrimary && !multiplePointers && !dragged && !moved(event);
    },
    cancel(event) {
      pointers.delete(event.pointerId);
      canSelect = false;
      firstClickMesh = undefined;
    },
    click(event) {
      if (!canSelect || event.button !== 0) return;
      // Selecting a small muscle can change the opacity of tissue above it.
      // The second click must keep the first target rather than pick a new layer.
      const mesh = event.detail > 1 && firstClickMesh?.visible ? firstClickMesh : pick(event, event.altKey);
      firstClickMesh = mesh;
      if (mesh) select(mesh);
    },
    doubleClick(event) {
      if (!canSelect || event.button !== 0 || event.altKey) return false;
      const mesh = firstClickMesh?.visible ? firstClickMesh : pick(event, false);
      if (!mesh) return false;
      select(mesh);
      focus(mesh);
      return true;
    },
  };
}
