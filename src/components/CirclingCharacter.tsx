import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, Vector3 } from "three";

export default function CirclingCharacter() {
  const meshRef = useRef<Mesh>(null);
  const time = useRef(0);

  // Circle parameters
  const radius = 20; // Radius of the circle
  const speed = 0.3; // Speed of rotation
  const height = 2; // Height above ground, increased from 1 to 2

  // Load the 3D model
  const { scene: thungScene } = useGLTF(
    "/models/characters/ThungThungThungSahur.glb"
  );

  // Enable shadows for the loaded model
  thungScene.traverse((child) => {
    if (child.isObject3D) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Update time
    time.current += delta * speed;

    // Calculate new position on circle
    const x = Math.cos(time.current) * radius;
    const z = Math.sin(time.current) * radius;

    // Update position
    meshRef.current.position.set(x, height, z);

    // Make the character face the direction it's moving
    const tangent = new Vector3(
      -Math.sin(time.current),
      0,
      Math.cos(time.current)
    );
    const lookAtPos = meshRef.current.position.clone().add(tangent);
    meshRef.current.lookAt(lookAtPos);
  });

  return (
    <mesh
      ref={meshRef}
      position={[radius, height, 0]}
      name="circling-character"
      castShadow
      receiveShadow
    >
      <primitive
        object={thungScene.clone()}
        scale={[2, 2, 2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </mesh>
  );
}

// Preload the model
useGLTF.preload("/models/characters/ThungThungThungSahur.glb");
