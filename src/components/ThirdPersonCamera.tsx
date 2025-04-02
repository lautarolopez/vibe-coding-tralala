import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, PerspectiveCamera as ThreePerspectiveCamera } from "three";
import { PerspectiveCamera } from "@react-three/drei";

export default function ThirdPersonCamera() {
  const { scene } = useThree();
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const targetPosition = useRef(new Vector3());
  const cameraOffset = new Vector3(0, 3, -5); // Fixed offset from character

  useFrame(() => {
    if (!cameraRef.current) return;

    // Find the character in the scene
    const character = scene.getObjectByName("character");
    if (!character) return;

    // Get character's world position and rotation
    character.getWorldPosition(targetPosition.current);

    // Calculate camera position based on character's rotation
    const cameraPosition = cameraOffset
      .clone()
      .applyAxisAngle(new Vector3(0, 1, 0), character.rotation.y)
      .add(targetPosition.current);

    // Update camera position and look at target
    cameraRef.current.position.copy(cameraPosition);
    cameraRef.current.lookAt(targetPosition.current);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={75}
      position={[0, 3, -5]}
    />
  );
}
