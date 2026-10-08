import * as THREE from 'three';
import { boat } from '../../model/boat';
import type { Detail } from '../../model/settings';
import { SCENE } from '../sceneConfig';
import { nonSlipTexture, sailSeamTexture, teakTexture } from './textures';

/**
 * Base materials of the boat. partMesh() clones them so each part can be highlighted alone.
 * M3b: at high detail they are physically based (gelcoat with a clear coat, anodised and
 * stainless metal, teak, non-slip deck, sailcloth) and pick up the sky's reflections
 * (scene.environment); at low detail they are cheaper Lambert materials with the same colours
 * and textures.
 */
export interface BoatMaterials {
  /** Gelcoat topsides, with anti-fouling below the waterline and a boot stripe. */
  hull: THREE.Material;
  /** Non-slip deck and coachroof top. */
  deck: THREE.Material;
  teak: THREE.Material;
  /** Smooth white gelcoat: coachroof sides, coamings, channel covers. */
  gelcoat: THREE.Material;
  /** Black plastic and hard-anodised fittings: clutches, blocks, wheels, winch drums. */
  dark: THREE.Material;
  appendage: THREE.Material;
  /** Silver anodised mast and boom. */
  spar: THREE.Material;
  /** Dark anodised spreaders. */
  spreader: THREE.Material;
  wire: THREE.Material;
  /** Polished stainless: stanchions, pulpits, sprayhood frame, track. */
  fitting: THREE.Material;
  /** Chrome winch tops. */
  chrome: THREE.Material;
  block: THREE.Material;
  fabric: THREE.Material;
  glass: THREE.Material;
  sail: THREE.Material;
}

type Look = {
  color: string;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  map?: THREE.Texture;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
};

/** A texture that tiles every `u` × `v` metres on geometry whose uv is in metres. */
function tiled(texture: THREE.Texture, u: number, v: number): THREE.Texture {
  const copy = texture.clone();
  copy.repeat.set(1 / u, 1 / v);
  copy.needsUpdate = true;
  return copy;
}

export function createMaterials(detail: Detail = 'high'): BoatMaterials {
  const c = SCENE.boat;
  const tex = SCENE.textures;
  const high = detail === 'high';
  // Double-sided: hull, deck and sails are open surfaces; three.js flips the normal for back
  // faces, so lighting stays right whichever side is seen.
  const make = (look: Look): THREE.Material => {
    const common = {
      color: look.color,
      side: THREE.DoubleSide,
      ...(look.map ? { map: look.map } : {}),
      ...(look.transparent ? { transparent: true, opacity: look.opacity ?? 1 } : {}),
      ...(look.depthWrite === false ? { depthWrite: false } : {}),
    };
    if (!high) return new THREE.MeshLambertMaterial(common);
    const standard = {
      ...common,
      roughness: look.roughness ?? 0.6,
      metalness: look.metalness ?? 0,
      ...(look.bumpMap ? { bumpMap: look.bumpMap, bumpScale: look.bumpScale ?? 1 } : {}),
    };
    return look.clearcoat
      ? new THREE.MeshPhysicalMaterial({
          ...standard,
          clearcoat: look.clearcoat,
          clearcoatRoughness: c.clearcoatRoughness,
        })
      : new THREE.MeshStandardMaterial(standard);
  };

  const hull = make({ color: c.hull, roughness: 0.3, clearcoat: 1 });
  addWaterlineBands(hull);
  const nonSlip = tiled(nonSlipTexture(), tex.nonSlip.tileM, tex.nonSlip.tileM);
  return {
    hull,
    deck: make({ color: c.deck, roughness: 0.85, bumpMap: nonSlip, bumpScale: 1.2 }),
    teak: make({
      color: '#ffffff',
      roughness: 0.8,
      map: tiled(
        teakTexture(),
        tex.teak.tileLengthM,
        tex.teak.planksPerTile * tex.teak.plankWidthM,
      ),
    }),
    gelcoat: make({ color: c.gelcoat, roughness: 0.3, clearcoat: 0.6 }),
    dark: make({ color: c.dark, roughness: 0.45 }),
    appendage: make({ color: c.appendage, roughness: 0.75 }),
    spar: make({ color: c.spar, roughness: 0.32, metalness: 0.75 }),
    spreader: make({ color: c.spreader, roughness: 0.4, metalness: 0.5 }),
    wire: make({ color: c.wire, roughness: 0.3, metalness: 0.9 }),
    fitting: make({ color: c.fitting, roughness: 0.18, metalness: 1 }),
    chrome: make({ color: c.chrome, roughness: 0.08, metalness: 1 }),
    block: make({ color: c.block, roughness: 0.5 }),
    fabric: make({ color: c.fabric, roughness: 0.9 }),
    glass: make({
      color: c.glass,
      roughness: 0.05,
      transparent: true,
      opacity: c.glassOpacity,
      depthWrite: false,
    }),
    sail: make({
      color: c.sail,
      roughness: 0.85,
      map: tiled(sailSeamTexture(), 1, boat.modelDetail.sailPanelHeightM),
      transparent: true,
      opacity: c.sailOpacity,
    }),
  };
}

/**
 * Anti-fouling below the waterline and a thin boot stripe just above it, drawn by height in
 * the shader (sharp edges whatever the hull's triangles). The boat's frame is the scene's,
 * so the object's y is the height above the waterline.
 */
function addWaterlineBands(material: THREE.Material): void {
  const w = SCENE.boat.waterline;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.antifoulColor = { value: new THREE.Color(w.antifouling) };
    shader.uniforms.stripeColor = { value: new THREE.Color(w.stripe) };
    shader.uniforms.antifoulTop = { value: w.antifoulingTopY };
    shader.uniforms.stripeTop = { value: w.stripeTopY };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vBoatY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoatY = transformed.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vBoatY;
uniform vec3 antifoulColor;
uniform vec3 stripeColor;
uniform float antifoulTop;
uniform float stripeTop;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float edge = fwidth(vBoatY) + 1e-4;
float aboveAntifoul = smoothstep(antifoulTop - edge, antifoulTop + edge, vBoatY);
float belowStripeTop = 1.0 - smoothstep(stripeTop - edge, stripeTop + edge, vBoatY);
diffuseColor.rgb = mix(antifoulColor, diffuseColor.rgb, aboveAntifoul);
diffuseColor.rgb = mix(diffuseColor.rgb, stripeColor, aboveAntifoul * belowStripeTop);`,
      );
  };
  material.customProgramCacheKey = () => 'hull-waterline-bands';
}
