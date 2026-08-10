import * as THREE from 'three';

const COLLECT_RADIUS = 22;

// Spread across the map at varied altitudes so chasing them pulls the player
// through different parts of the world, not just along the beacon path.
const GEM_SPOTS = [
  [120, -150, 60], [-200, 80, 90], [300, -400, 120], [-450, -200, 70],
  [50, 400, 100], [-350, 350, 60], [500, 100, 140], [-150, -600, 80],
  [650, -300, 110], [-600, 50, 70], [200, 700, 130], [-700, -450, 90],
  [400, 550, 60], [-250, -350, 100], [750, 400, 80], [0, -900, 150],
  [-500, 600, 70], [600, -700, 100], [-800, 250, 60], [100, 250, 90],
];

function buildGemMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd9f0, emissive: 0xff6fc0, emissiveIntensity: 1.1,
    roughness: 0.25, metalness: 0.4, flatShading: true,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), mat);
  crystal.scale.y = 1.6;
  group.add(crystal);
  const light = new THREE.PointLight(0xff9fd6, 1.1, 60);
  group.add(light);
  return group;
}

export function buildGems(scene, heightAt) {
  return GEM_SPOTS.map(([x, z, alt]) => {
    const y = heightAt(x, z) + alt;
    const mesh = buildGemMesh();
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { position: new THREE.Vector3(x, y, z), mesh, collected: false, t: Math.random() * 10 };
  });
}

export function removeGems(scene, gems) {
  for (const g of gems) scene.remove(g.mesh);
}

// Animates uncollected gems and checks the dragon against them. Returns the
// number newly collected this frame (almost always 0 or 1).
export function updateGems(dt, gems, dragonPos) {
  let collected = 0;
  for (const g of gems) {
    if (g.collected) continue;
    g.t += dt;
    g.mesh.rotation.y += dt * 1.4;
    g.mesh.position.y = g.position.y + Math.sin(g.t * 1.6) * 4;
    if (dragonPos.distanceTo(g.mesh.position) < COLLECT_RADIUS) {
      g.collected = true;
      g.mesh.visible = false;
      collected++;
    }
  }
  return collected;
}
