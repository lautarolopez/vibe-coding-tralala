import { Canvas } from "@react-three/fiber";
import Character from "./Character";
import Scene from "./Scene";
import ThirdPersonCamera from "./ThirdPersonCamera";
import CirclingCharacter from "./CirclingCharacter";
import { KeyboardControls } from "@react-three/drei";
import { useEffect, useState } from "react";

export default function Game() {
  const [cameraY, setCameraY] = useState(2);
  const minCameraY = 1;
  const maxCameraY = 3;
  const mouseSensitivity = 0.005;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Only use vertical mouse movement (movementY)
      const newY = cameraY - event.movementY * mouseSensitivity;
      // Clamp the camera position between min and max height
      setCameraY(Math.max(minCameraY, Math.min(maxCameraY, newY)));
    };

    // Add mouse move listener
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      // Clean up listener
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [cameraY]); // Re-run effect when cameraY changes

  return (
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "w", "W"] },
        { name: "backward", keys: ["ArrowDown", "s", "S"] },
        { name: "left", keys: ["ArrowLeft", "a", "A"] },
        { name: "right", keys: ["ArrowRight", "d", "D"] },
        { name: "jump", keys: ["Space"] },
        { name: "sprint", keys: ["Shift"] },
      ]}
    >
      <div className="w-full h-screen">
        <Canvas
          shadows
          camera={{
            position: [0, cameraY, 5],
            fov: 75,
          }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Scene />
          <Character />
          <CirclingCharacter />
          <ThirdPersonCamera />
        </Canvas>
      </div>
    </KeyboardControls>
  );
}
