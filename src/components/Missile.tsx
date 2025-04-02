import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, Vector3, Raycaster } from "three";

interface MissileProps {
  position: Vector3;
  direction: Vector3;
  onHit?: (position: Vector3) => void;
}

export default function Missile({ position, direction, onHit }: MissileProps) {
  const meshRef = useRef<Mesh>(null);
  const speed = 0.5; // Missile speed
  const raycaster = new Raycaster();

  // Load the missile model
  const { scene: missileScene } = useGLTF("/models/characters/Missile.glb");

  // Enable shadows for the missile
  missileScene.traverse((child) => {
    if (child.isObject3D) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      // Set initial position
      meshRef.current.position.copy(position);

      // Make missile face the direction of travel
      const lookAtTarget = position.clone().add(direction);
      meshRef.current.lookAt(lookAtTarget);
    }
  }, [position, direction]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Update position
    const movement = direction.clone().multiplyScalar(speed);
    meshRef.current.position.add(movement);

    // Check for collisions
    raycaster.set(meshRef.current.position, direction);
    const intersects = raycaster.intersectObjects(
      state.scene.children.filter(
        (child) =>
          child.name === "wall" ||
          child.name === "character" ||
          child.name === "circling-character"
      ),
      true
    );

    if (intersects.length > 0 && intersects[0].distance < 1) {
      // Collision detected
      if (onHit) {
        onHit(meshRef.current.position.clone());
      }
    }
  });

  return (
    <mesh ref={meshRef} name="missile" castShadow receiveShadow>
      <primitive
        object={missileScene.clone()}
        scale={[0.3, 0.3, 0.3]}
        rotation={[0, -Math.PI, Math.PI / 2]} // Rotated to point forward properly
      />
    </mesh>
  );
}

// Preload the missile model
useGLTF.preload("/models/characters/Missile.glb");
